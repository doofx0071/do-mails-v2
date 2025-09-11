import { EmailMessage, EmailThread, ThreadingOptions } from './types';
export declare class EmailThreadingService {
    private options;
    constructor(options?: ThreadingOptions);
    /**
     * Normalize email subject for threading
     */
    private normalizeSubject;
    /**
     * Extract message references from headers
     */
    private extractReferences;
    /**
     * Get all participants from a message
     */
    private getParticipants;
    /**
     * Check if two messages belong to the same thread
     */
    private messagesMatch;
    /**
     * Group messages into threads
     */
    groupMessagesIntoThreads(messages: EmailMessage[]): EmailThread[];
    /**
     * Add a message to an existing thread
     */
    addMessageToThread(thread: EmailThread, message: EmailMessage): EmailThread;
    /**
     * Find the thread that a message belongs to
     */
    findThreadForMessage(threads: EmailThread[], message: EmailMessage): EmailThread | null;
    /**
     * Merge two threads if they should be combined
     */
    mergeThreadsIfNeeded(thread1: EmailThread, thread2: EmailThread): EmailThread | null;
}
//# sourceMappingURL=threading.d.ts.map