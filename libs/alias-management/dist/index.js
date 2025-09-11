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
exports.AliasManagement = void 0;
exports.createAliasManager = createAliasManager;
// Main exports for alias-management library
__exportStar(require("./types"), exports);
__exportStar(require("./validator"), exports);
__exportStar(require("./generator"), exports);
__exportStar(require("./manager"), exports);
const manager_1 = require("./manager");
const validator_1 = require("./validator");
const generator_1 = require("./generator");
/**
 * Main AliasManagement class that combines all functionality
 */
class AliasManagement {
    constructor(config = {}) {
        this.manager = new manager_1.AliasManager(config);
        this.validator = new validator_1.AliasValidator(config);
        this.generator = new generator_1.AliasGenerator();
    }
    /**
     * Get manager instance
     */
    get manage() {
        return this.manager;
    }
    /**
     * Get validator instance
     */
    get validate() {
        return this.validator;
    }
    /**
     * Get generator instance
     */
    get generate() {
        return this.generator;
    }
    /**
     * Create a new alias
     */
    async createAlias(domainId, aliasName, isEnabled = true) {
        return this.manager.createAlias({
            domainId,
            aliasName,
            isEnabled
        });
    }
    /**
     * Validate alias name
     */
    validateAlias(aliasName) {
        return this.validator.validateAlias(aliasName);
    }
    /**
     * Generate alias suggestions
     */
    generateAliases(options) {
        return this.generator.generateAliases(options);
    }
    /**
     * Check alias availability
     */
    async checkAvailability(aliasName, domainName, existingAliases) {
        return this.validator.checkAvailability(aliasName, domainName, existingAliases);
    }
    /**
     * Get alias statistics
     */
    async getStats(domainId) {
        return this.manager.getAliasStats(domainId);
    }
    /**
     * Search aliases
     */
    async searchAliases(options) {
        return this.manager.searchAliases(options);
    }
    /**
     * Update alias
     */
    async updateAlias(aliasId, updates) {
        return this.manager.updateAlias(aliasId, updates);
    }
    /**
     * Delete alias
     */
    async deleteAlias(aliasId) {
        return this.manager.deleteAlias(aliasId);
    }
    /**
     * Get alias by ID
     */
    async getAlias(aliasId) {
        return this.manager.getAlias(aliasId);
    }
}
exports.AliasManagement = AliasManagement;
/**
 * Create a new AliasManagement instance
 */
function createAliasManager(config) {
    return new AliasManagement(config);
}
/**
 * Default export
 */
exports.default = AliasManagement;
//# sourceMappingURL=index.js.map