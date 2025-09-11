"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailThreadingService = void 0;
const types_1 = require("./types");
// Simple UUID generator for Node.js
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
class EmailThreadingService {
    constructor(options = {}) {
        this.options = {
            subjectNormalization: options.subjectNormalization ?? true,
            referencesTracking: options.referencesTracking ?? true,
            participantGrouping: options.participantGrouping ?? true,
            timeWindowHours: options.timeWindowHours ?? 24
        };
    }
    /**
     * Normalize email subject for threading
     */
    normalizeSubject(subject) {
        if (!this.options.subjectNormalization) {
            return subject;
        }
        return subject
            .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '') // Remove reply/forward prefixes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .toLowerCase();
    }
    /**
     * Extract message references from headers
     */
    extractReferences(message) {
        const references = [];
        // Add In-Reply-To if present
        if (message.inReplyTo) {
            references.push(message.inReplyTo);
        }
        // Add References if present
        if (message.references && message.references.length > 0) {
            references.push(...message.references);
        }
        return [...new Set(references)]; // Remove duplicates
    }
    /**
     * Get all participants from a message
     */
    getParticipants(message) {
        const participants = new Set();
        participants.add(message.from);
        message.to.forEach(addr => participants.add(addr));
        message.cc.forEach(addr => participants.add(addr));
        return Array.from(participants);
    }
    /**
     * Check if two messages belong to the same thread
     */
    messagesMatch(msg1, msg2) {
        // Check by message references
        if (this.options.referencesTracking) {
            const refs1 = this.extractReferences(msg1);
            const refs2 = this.extractReferences(msg2);
            // If either message references the other's ID
            if (refs1.includes(msg2.messageId) || refs2.includes(msg1.messageId)) {
                return true;
            }
            // If they share any references
            const sharedRefs = refs1.filter(ref => refs2.includes(ref));
            if (sharedRefs.length > 0) {
                return true;
            }
        }
        // Check by normalized subject
        if (this.options.subjectNormalization) {
            const subject1 = this.normalizeSubject(msg1.subject);
            const subject2 = this.normalizeSubject(msg2.subject);
            if (subject1 === subject2 && subject1.length > 0) {
                // Additional checks for subject-based threading
                if (this.options.participantGrouping) {
                    const participants1 = new Set(this.getParticipants(msg1));
                    const participants2 = new Set(this.getParticipants(msg2));
                    // Check if there's participant overlap
                    const overlap = Array.from(participants1).some(p => participants2.has(p));
                    if (overlap) {
                        // Check time window
                        const timeDiff = Math.abs(msg1.receivedAt.getTime() - msg2.receivedAt.getTime());
                        const maxTimeDiff = this.options.timeWindowHours * 60 * 60 * 1000;
                        return timeDiff <= maxTimeDiff;
                    }
                }
                else {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Group messages into threads
     */
    groupMessagesIntoThreads(messages) {
        if (messages.length === 0) {
            return [];
        }
        const threads = [];
        const processedMessages = new Set();
        // Sort messages by received date
        const sortedMessages = [...messages].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
        for (const message of sortedMessages) {
            if (processedMessages.has(message.id)) {
                continue;
            }
            // Find existing thread for this message
            let targetThread = null;
            for (const thread of threads) {
                const threadMatches = thread.messages.some(threadMsg => this.messagesMatch(message, threadMsg));
                if (threadMatches) {
                    targetThread = thread;
                    break;
                }
            }
            if (targetThread) {
                // Add to existing thread
                targetThread.messages.push(message);
                targetThread.messageCount = targetThread.messages.length;
                targetThread.lastMessageAt = new Date(Math.max(targetThread.lastMessageAt.getTime(), message.receivedAt.getTime()));
                // Update participants
                const newParticipants = this.getParticipants(message);
                const participantSet = new Set([...targetThread.participants, ...newParticipants]);
                targetThread.participants = Array.from(participantSet);
            }
            else {
                // Create new thread
                const newThread = {
                    id: generateUUID(),
                    subject: this.normalizeSubject(message.subject) || 'No Subject',
                    participants: this.getParticipants(message),
                    messageCount: 1,
                    lastMessageAt: message.receivedAt,
                    messages: [message]
                };
                threads.push(newThread);
            }
            processedMessages.add(message.id);
        }
        // Sort threads by last message date (newest first)
        return threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    }
    /**
     * Add a message to an existing thread
     */
    addMessageToThread(thread, message) {
        // Check if message belongs to this thread
        const belongsToThread = thread.messages.some(threadMsg => this.messagesMatch(message, threadMsg));
        if (!belongsToThread) {
            throw new types_1.ThreadingError('Message does not belong to this thread', { threadId: thread.id, messageId: message.id });
        }
        // Check if message already exists in thread
        const messageExists = thread.messages.some(msg => msg.id === message.id);
        if (messageExists) {
            return thread; // No changes needed
        }
        // Add message to thread
        const updatedMessages = [...thread.messages, message]
            .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
        // Update participants
        const newParticipants = this.getParticipants(message);
        const participantSet = new Set([...thread.participants, ...newParticipants]);
        return {
            ...thread,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            lastMessageAt: new Date(Math.max(thread.lastMessageAt.getTime(), message.receivedAt.getTime())),
            participants: Array.from(participantSet)
        };
    }
    /**
     * Find the thread that a message belongs to
     */
    findThreadForMessage(threads, message) {
        for (const thread of threads) {
            const belongsToThread = thread.messages.some(threadMsg => this.messagesMatch(message, threadMsg));
            if (belongsToThread) {
                return thread;
            }
        }
        return null;
    }
    /**
     * Merge two threads if they should be combined
     */
    mergeThreadsIfNeeded(thread1, thread2) {
        // Check if any message from thread1 matches any message from thread2
        const shouldMerge = thread1.messages.some(msg1 => thread2.messages.some(msg2 => this.messagesMatch(msg1, msg2)));
        if (!shouldMerge) {
            return null;
        }
        // Merge the threads
        const allMessages = [...thread1.messages, ...thread2.messages]
            .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
        // Remove duplicate messages
        const uniqueMessages = allMessages.filter((msg, index, arr) => arr.findIndex(m => m.id === msg.id) === index);
        // Combine participants
        const allParticipants = [...thread1.participants, ...thread2.participants];
        const uniqueParticipants = Array.from(new Set(allParticipants));
        return {
            id: thread1.id, // Keep the first thread's ID
            subject: thread1.subject, // Keep the first thread's subject
            participants: uniqueParticipants,
            messageCount: uniqueMessages.length,
            lastMessageAt: new Date(Math.max(thread1.lastMessageAt.getTime(), thread2.lastMessageAt.getTime())),
            messages: uniqueMessages
        };
    }
}
exports.EmailThreadingService = EmailThreadingService;
//# sourceMappingURL=threading.js.map