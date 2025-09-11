"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessing = void 0;
exports.createEmailProcessor = createEmailProcessor;
// Main exports for email-processing library
__exportStar(require("./types"), exports);
__exportStar(require("./mailgun"), exports);
__exportStar(require("./threading"), exports);
__exportStar(require("./processor"), exports);
const mailgun_1 = require("./mailgun");
const threading_1 = require("./threading");
const processor_1 = require("./processor");
/**
 * Main EmailProcessing class that combines all functionality
 */
class EmailProcessing {
    constructor(config) {
        this.config = {
            mailgun: config.mailgun,
            threading: config.threading ?? {
                subjectNormalization: true,
                referencesTracking: true,
                participantGrouping: true,
                timeWindowHours: 24
            },
            maxAttachmentSize: config.maxAttachmentSize ?? 25 * 1024 * 1024,
            allowedAttachmentTypes: config.allowedAttachmentTypes ?? [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'text/csv',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        };
        this.mailgunService = new mailgun_1.MailgunService(this.config.mailgun);
        this.threadingService = new threading_1.EmailThreadingService(this.config.threading);
        this.processor = new processor_1.EmailProcessor(this.mailgunService, this.threadingService, this.config);
    }
    /**
     * Get Mailgun service instance
     */
    get mailgun() {
        return this.mailgunService;
    }
    /**
     * Get threading service instance
     */
    get threading() {
        return this.threadingService;
    }
    /**
     * Get processor instance
     */
    get process() {
        return this.processor;
    }
    /**
     * Process inbound webhook from Mailgun
     */
    async processInboundWebhook(webhookData) {
        return this.processor.processInboundWebhook(webhookData);
    }
    /**
     * Send email via Mailgun
     */
    async sendEmail(request) {
        return this.processor.sendEmail(request);
    }
    /**
     * Validate email address
     */
    validateEmail(email) {
        return this.processor.validateEmail(email);
    }
    /**
     * Group messages into threads
     */
    groupIntoThreads(messages) {
        return this.threading.groupMessagesIntoThreads(messages);
    }
}
exports.EmailProcessing = EmailProcessing;
/**
 * Create a new EmailProcessing instance
 */
function createEmailProcessor(config) {
    return new EmailProcessing(config);
}
/**
 * Default export
 */
exports.default = EmailProcessing;
//# sourceMappingURL=index.js.map