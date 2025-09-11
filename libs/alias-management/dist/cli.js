#!/usr/bin/env node
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
const types_1 = require("./types");
const program = new commander_1.Command();
// CLI version and description
program
    .name('alias-management')
    .description('Email alias management library with validation')
    .version('1.0.0');
// Global options
program
    .option('--config <path>', 'Path to configuration file')
    .option('--max-aliases <count>', 'Maximum aliases per domain', '1000')
    .option('--max-length <length>', 'Maximum alias length', '64')
    .option('--min-length <length>', 'Minimum alias length', '1');
// Create alias command
program
    .command('create-alias')
    .description('Create a new email alias')
    .requiredOption('--domain-id <id>', 'Domain ID')
    .requiredOption('--alias <name>', 'Alias name')
    .option('--enabled', 'Enable the alias', true)
    .option('--disabled', 'Disable the alias')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        const isEnabled = options.disabled ? false : true;
        console.log(chalk_1.default.blue(`🔧 Creating alias: ${options.alias}`));
        console.log(chalk_1.default.gray(`Domain ID: ${options.domainId}`));
        console.log(chalk_1.default.gray(`Enabled: ${isEnabled}`));
        console.log();
        const alias = await manager.createAlias(options.domainId, options.alias, isEnabled);
        console.log(chalk_1.default.green('✓ Alias created successfully!'));
        console.log(JSON.stringify({
            id: alias.id,
            aliasName: alias.aliasName,
            fullAddress: alias.fullAddress,
            isEnabled: alias.isEnabled,
            createdAt: alias.createdAt
        }, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Failed to create alias:'), error.message);
        if (error instanceof types_1.AliasManagementError) {
            console.error(chalk_1.default.gray('Details:'), error.details);
        }
        process.exit(1);
    }
});
// List aliases command
program
    .command('list-aliases')
    .description('List email aliases')
    .option('--domain-id <id>', 'Filter by domain ID')
    .option('--enabled', 'Show only enabled aliases')
    .option('--disabled', 'Show only disabled aliases')
    .option('--query <query>', 'Search query')
    .option('--limit <count>', 'Maximum number of results', '50')
    .option('--offset <offset>', 'Results offset', '0')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        console.log(chalk_1.default.blue('📋 Listing aliases...'));
        console.log();
        const searchOptions = {
            domainId: options.domainId,
            isEnabled: options.enabled ? true : options.disabled ? false : undefined,
            query: options.query,
            limit: parseInt(options.limit),
            offset: parseInt(options.offset)
        };
        const result = await manager.searchAliases(searchOptions);
        console.log(chalk_1.default.green(`✓ Found ${result.total} aliases`));
        console.log();
        if (result.aliases.length === 0) {
            console.log(chalk_1.default.yellow('No aliases found'));
        }
        else {
            result.aliases.forEach(alias => {
                const status = alias.isEnabled ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
                console.log(`${status} ${alias.fullAddress} (${alias.id})`);
                console.log(chalk_1.default.gray(`   Created: ${alias.createdAt.toISOString()}`));
                if (alias.lastEmailReceivedAt) {
                    console.log(chalk_1.default.gray(`   Last email: ${alias.lastEmailReceivedAt.toISOString()}`));
                }
                console.log();
            });
        }
        if (result.hasMore) {
            console.log(chalk_1.default.yellow(`... and ${result.total - result.aliases.length} more`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Failed to list aliases:'), error.message);
        process.exit(1);
    }
});
// Validate alias command
program
    .command('validate-alias')
    .description('Validate alias name format and rules')
    .requiredOption('--alias <name>', 'Alias name to validate')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        console.log(chalk_1.default.blue(`🔍 Validating alias: ${options.alias}`));
        console.log();
        const result = manager.validateAlias(options.alias);
        if (result.valid) {
            console.log(chalk_1.default.green('✓ Alias is valid'));
            if (result.warnings.length > 0) {
                console.log(chalk_1.default.yellow('Warnings:'));
                result.warnings.forEach(warning => {
                    console.log(chalk_1.default.yellow(`  - ${warning}`));
                });
            }
        }
        else {
            console.log(chalk_1.default.red('✗ Alias is invalid'));
            console.log(chalk_1.default.red('Errors:'));
            result.errors.forEach(error => {
                console.log(chalk_1.default.red(`  - ${error}`));
            });
            if (result.suggestions.length > 0) {
                console.log(chalk_1.default.yellow('Suggestions:'));
                result.suggestions.forEach(suggestion => {
                    console.log(chalk_1.default.yellow(`  - ${suggestion}`));
                });
            }
            process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Validation failed:'), error.message);
        process.exit(1);
    }
});
// Generate alias command
program
    .command('generate-alias')
    .description('Generate random alias names')
    .option('--count <count>', 'Number of aliases to generate', '1')
    .option('--length <length>', 'Alias length', '8')
    .option('--pattern <pattern>', 'Generation pattern (random, readable, uuid, timestamp)', 'random')
    .option('--prefix <prefix>', 'Alias prefix', '')
    .option('--suffix <suffix>', 'Alias suffix', '')
    .option('--numbers', 'Include numbers', true)
    .option('--no-numbers', 'Exclude numbers')
    .option('--special-chars', 'Include special characters')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        console.log(chalk_1.default.blue(`🎲 Generating ${options.count} alias(es)...`));
        console.log(chalk_1.default.gray(`Pattern: ${options.pattern}`));
        console.log(chalk_1.default.gray(`Length: ${options.length}`));
        console.log();
        const generationOptions = {
            count: parseInt(options.count),
            length: parseInt(options.length),
            pattern: options.pattern,
            prefix: options.prefix,
            suffix: options.suffix,
            includeNumbers: options.numbers,
            includeSpecialChars: options.specialChars
        };
        const aliases = manager.generateAliases(generationOptions);
        console.log(chalk_1.default.green(`✓ Generated ${aliases.length} alias(es)`));
        console.log();
        aliases.forEach((alias, index) => {
            console.log(`${index + 1}. ${chalk_1.default.cyan(alias)}`);
        });
        console.log();
        console.log(JSON.stringify({
            aliases,
            options: generationOptions,
            generated: new Date().toISOString()
        }, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Generation failed:'), error.message);
        process.exit(1);
    }
});
// Check availability command
program
    .command('check-availability')
    .description('Check if alias is available')
    .requiredOption('--alias <name>', 'Alias name to check')
    .requiredOption('--domain <domain>', 'Domain name')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        console.log(chalk_1.default.blue(`🔍 Checking availability: ${options.alias}@${options.domain}`));
        console.log();
        const result = await manager.checkAvailability(options.alias, options.domain);
        if (result.available) {
            console.log(chalk_1.default.green('✓ Alias is available'));
        }
        else {
            console.log(chalk_1.default.red('✗ Alias is not available'));
            if (result.reason) {
                console.log(chalk_1.default.red(`Reason: ${result.reason}`));
            }
            if (result.suggestions.length > 0) {
                console.log(chalk_1.default.yellow('Suggestions:'));
                result.suggestions.forEach(suggestion => {
                    console.log(chalk_1.default.yellow(`  - ${suggestion}@${options.domain}`));
                });
            }
            process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Availability check failed:'), error.message);
        process.exit(1);
    }
});
// Statistics command
program
    .command('stats')
    .description('Get alias statistics')
    .option('--domain-id <id>', 'Filter by domain ID')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const manager = new index_1.AliasManagement(config);
        console.log(chalk_1.default.blue('📊 Getting alias statistics...'));
        console.log();
        const stats = await manager.getStats(options.domainId);
        console.log(chalk_1.default.green('✓ Statistics retrieved'));
        console.log();
        console.log(`Total aliases: ${chalk_1.default.cyan(stats.totalAliases)}`);
        console.log(`Enabled: ${chalk_1.default.green(stats.enabledAliases)}`);
        console.log(`Disabled: ${chalk_1.default.red(stats.disabledAliases)}`);
        console.log(`With activity: ${chalk_1.default.yellow(stats.aliasesWithActivity)}`);
        console.log(`Created today: ${chalk_1.default.blue(stats.aliasesCreatedToday)}`);
        console.log(`Created this week: ${chalk_1.default.blue(stats.aliasesCreatedThisWeek)}`);
        console.log(`Created this month: ${chalk_1.default.blue(stats.aliasesCreatedThisMonth)}`);
        console.log();
        console.log(JSON.stringify(stats, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Failed to get statistics:'), error.message);
        process.exit(1);
    }
});
// Help command
program
    .command('help')
    .description('Display help information')
    .action(() => {
    console.log(chalk_1.default.blue('Alias Management CLI'));
    console.log(chalk_1.default.gray('A library for managing email aliases with validation'));
    console.log();
    console.log(chalk_1.default.yellow('Usage:'));
    console.log('  alias-management [command] [options]');
    console.log();
    console.log(chalk_1.default.yellow('Commands:'));
    console.log('  create-alias       Create a new email alias');
    console.log('  list-aliases       List email aliases');
    console.log('  validate-alias     Validate alias name format and rules');
    console.log('  generate-alias     Generate random alias names');
    console.log('  check-availability Check if alias is available');
    console.log('  stats             Get alias statistics');
    console.log('  help              Display this help information');
    console.log();
    console.log(chalk_1.default.yellow('Global Options:'));
    console.log('  --config <path>        Path to configuration file');
    console.log('  --max-aliases <count>  Maximum aliases per domain');
    console.log('  --max-length <length>  Maximum alias length');
    console.log('  --min-length <length>  Minimum alias length');
    console.log();
    console.log(chalk_1.default.yellow('Examples:'));
    console.log('  alias-management create-alias --domain-id abc123 --alias myalias');
    console.log('  alias-management validate-alias --alias test-alias');
    console.log('  alias-management generate-alias --count 5 --pattern readable');
    console.log('  alias-management list-aliases --domain-id abc123 --enabled');
});
// Helper function to get configuration
async function getConfig(globalOpts, commandOpts) {
    let config = {};
    // Load from config file if provided
    if (globalOpts.config) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const configFile = fs.readFileSync(globalOpts.config, 'utf8');
            config = JSON.parse(configFile);
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to load config file: ${globalOpts.config}`));
            process.exit(1);
        }
    }
    // Override with command line options
    const finalConfig = {
        maxAliasesPerDomain: parseInt(globalOpts.maxAliases) || config.maxAliasesPerDomain || 1000,
        maxAliasLength: parseInt(globalOpts.maxLength) || config.maxAliasLength || 64,
        minAliasLength: parseInt(globalOpts.minLength) || config.minAliasLength || 1,
        allowedCharacters: config.allowedCharacters || 'abcdefghijklmnopqrstuvwxyz0123456789._-',
        reservedAliases: config.reservedAliases || [
            'admin', 'administrator', 'root', 'postmaster', 'webmaster',
            'hostmaster', 'abuse', 'security', 'noreply', 'no-reply',
            'support', 'help', 'info', 'contact', 'sales', 'billing'
        ],
        blockedPatterns: config.blockedPatterns || [
            'test', 'temp', 'temporary', 'delete', 'remove', 'spam'
        ],
        enableProfanityFilter: config.enableProfanityFilter !== undefined ? config.enableProfanityFilter : true,
        enableSimilarityCheck: config.enableSimilarityCheck !== undefined ? config.enableSimilarityCheck : true,
        similarityThreshold: config.similarityThreshold || 0.8
    };
    return finalConfig;
}
// Parse command line arguments
program.parse();
// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=cli.js.map