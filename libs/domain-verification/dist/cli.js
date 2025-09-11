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
    .name('domain-verification')
    .description('Domain verification library with DNS checking')
    .version('1.0.0');
// Global options
program
    .option('--dns-servers <servers>', 'DNS servers to use (comma-separated)')
    .option('--timeout <ms>', 'DNS query timeout in milliseconds', '10000')
    .option('--retries <count>', 'Number of retries for failed queries', '3')
    .option('--config <path>', 'Path to configuration file');
// Verify domain command
program
    .command('verify-domain')
    .description('Verify domain ownership using DNS TXT record')
    .requiredOption('--domain <domain>', 'Domain to verify')
    .requiredOption('--token <token>', 'Verification token')
    .option('--record-name <name>', 'DNS record name prefix', '_domails-verify')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const verifier = new index_1.DomainVerification(config);
        console.log(chalk_1.default.blue(`🔍 Verifying domain: ${options.domain}`));
        console.log(chalk_1.default.gray(`Looking for token: ${options.token}`));
        console.log(chalk_1.default.gray(`DNS record: ${options.recordName}.${options.domain}`));
        console.log();
        const result = await verifier.verifyDomain(options.domain, options.token);
        if (result.verified) {
            console.log(chalk_1.default.green('✓ Domain verification successful!'));
            console.log(JSON.stringify({
                domain: result.domain,
                verified: result.verified,
                recordName: result.recordName,
                verificationTime: result.verificationTime,
                timestamp: result.timestamp
            }, null, 2));
        }
        else {
            console.log(chalk_1.default.red('✗ Domain verification failed'));
            console.log(chalk_1.default.red(`Error: ${result.error}`));
            if (result.dnsRecords.length > 0) {
                console.log(chalk_1.default.yellow('Found DNS records:'));
                result.dnsRecords.forEach(record => {
                    console.log(chalk_1.default.gray(`  - ${record}`));
                });
            }
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Verification failed:'), error.message);
        if (error instanceof types_1.DomainVerificationError) {
            console.error(chalk_1.default.gray('Details:'), error.details);
        }
        process.exit(1);
    }
});
// Check DNS command
program
    .command('check-dns')
    .description('Check DNS records for a domain')
    .requiredOption('--domain <domain>', 'Domain to check')
    .option('--type <type>', 'DNS record type (A, AAAA, MX, TXT, NS, CNAME)', 'A')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const verifier = new index_1.DomainVerification(config);
        console.log(chalk_1.default.blue(`🔍 Checking DNS records for: ${options.domain}`));
        console.log(chalk_1.default.gray(`Record type: ${options.type}`));
        console.log();
        const recordType = options.type.toUpperCase();
        const result = await verifier.queryDNS(options.domain, recordType);
        console.log(chalk_1.default.green(`✓ Found ${result.records.length} ${recordType} records`));
        console.log(JSON.stringify({
            domain: result.domain,
            recordType: result.recordType,
            records: result.records,
            queryTime: result.queryTime,
            timestamp: result.timestamp
        }, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ DNS query failed:'), error.message);
        process.exit(1);
    }
});
// Validate domain command
program
    .command('validate-domain')
    .description('Validate domain name format and rules')
    .requiredOption('--domain <domain>', 'Domain to validate')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const verifier = new index_1.DomainVerification(config);
        console.log(chalk_1.default.blue(`🔍 Validating domain: ${options.domain}`));
        console.log();
        const result = verifier.validateDomain(options.domain);
        if (result.valid) {
            console.log(chalk_1.default.green('✓ Domain is valid'));
            if (result.warnings.length > 0) {
                console.log(chalk_1.default.yellow('Warnings:'));
                result.warnings.forEach(warning => {
                    console.log(chalk_1.default.yellow(`  - ${warning}`));
                });
            }
        }
        else {
            console.log(chalk_1.default.red('✗ Domain is invalid'));
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
// Generate token command
program
    .command('generate-token')
    .description('Generate a verification token')
    .option('--length <length>', 'Token length', '32')
    .option('--prefix <prefix>', 'Token prefix', '')
    .option('--charset <charset>', 'Character set (alphanumeric, hex, base64)', 'alphanumeric')
    .option('--timestamp', 'Include timestamp in token')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const verifier = new index_1.DomainVerification(config);
        const tokenOptions = {
            length: parseInt(options.length),
            prefix: options.prefix,
            charset: options.charset,
            includeTimestamp: options.timestamp
        };
        const token = verifier.generateToken(tokenOptions);
        console.log(chalk_1.default.green('✓ Generated verification token'));
        console.log(JSON.stringify({
            token,
            length: token.length,
            options: tokenOptions,
            generated: new Date().toISOString()
        }, null, 2));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Token generation failed:'), error.message);
        process.exit(1);
    }
});
// Health check command
program
    .command('health-check')
    .description('Perform comprehensive domain health check')
    .requiredOption('--domain <domain>', 'Domain to check')
    .action(async (options) => {
    try {
        const config = await getConfig(program.opts(), options);
        const verifier = new index_1.DomainVerification(config);
        console.log(chalk_1.default.blue(`🔍 Performing health check for: ${options.domain}`));
        console.log();
        const result = await verifier.healthCheck(options.domain);
        if (result.accessible && result.errors.length === 0) {
            console.log(chalk_1.default.green('✓ Domain health check passed'));
        }
        else {
            console.log(chalk_1.default.yellow('⚠ Domain health check completed with issues'));
        }
        console.log(JSON.stringify(result, null, 2));
        if (result.errors.length > 0) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Health check failed:'), error.message);
        process.exit(1);
    }
});
// Help command
program
    .command('help')
    .description('Display help information')
    .action(() => {
    console.log(chalk_1.default.blue('Domain Verification CLI'));
    console.log(chalk_1.default.gray('A library for domain verification with DNS checking'));
    console.log();
    console.log(chalk_1.default.yellow('Usage:'));
    console.log('  domain-verification [command] [options]');
    console.log();
    console.log(chalk_1.default.yellow('Commands:'));
    console.log('  verify-domain    Verify domain ownership using DNS TXT record');
    console.log('  check-dns        Check DNS records for a domain');
    console.log('  validate-domain  Validate domain name format and rules');
    console.log('  generate-token   Generate a verification token');
    console.log('  health-check     Perform comprehensive domain health check');
    console.log('  help            Display this help information');
    console.log();
    console.log(chalk_1.default.yellow('Global Options:'));
    console.log('  --dns-servers <servers>  DNS servers to use (comma-separated)');
    console.log('  --timeout <ms>           DNS query timeout in milliseconds');
    console.log('  --retries <count>        Number of retries for failed queries');
    console.log('  --config <path>          Path to configuration file');
    console.log();
    console.log(chalk_1.default.yellow('Examples:'));
    console.log('  domain-verification verify-domain --domain example.com --token abc123');
    console.log('  domain-verification check-dns --domain example.com --type MX');
    console.log('  domain-verification validate-domain --domain example.com');
    console.log('  domain-verification generate-token --length 64');
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
        defaultTimeout: parseInt(globalOpts.timeout) || config.defaultTimeout || 10000,
        defaultRetries: parseInt(globalOpts.retries) || config.defaultRetries || 3,
        recordPrefix: config.recordPrefix || '_domails-verify',
        allowedDomains: config.allowedDomains,
        blockedDomains: config.blockedDomains || [
            'localhost',
            'example.com',
            'example.org',
            'example.net',
            'test.com',
            'invalid'
        ],
        dnsServers: globalOpts.dnsServers ?
            globalOpts.dnsServers.split(',').map((s) => s.trim()) :
            config.dnsServers,
        cacheTimeout: config.cacheTimeout || 300000
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