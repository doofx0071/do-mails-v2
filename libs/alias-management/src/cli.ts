#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { AliasManagement } from './index'
import { 
  AliasManagementConfig,
  AliasManagementError,
  GenerationPattern
} from './types'

const program = new Command()

// CLI version and description
program
  .name('alias-management')
  .description('Email alias management library with validation')
  .version('1.0.0')

// Global options
program
  .option('--config <path>', 'Path to configuration file')
  .option('--max-aliases <count>', 'Maximum aliases per domain', '1000')
  .option('--max-length <length>', 'Maximum alias length', '64')
  .option('--min-length <length>', 'Minimum alias length', '1')

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
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      const isEnabled = options.disabled ? false : true
      
      console.log(chalk.blue(`🔧 Creating alias: ${options.alias}`))
      console.log(chalk.gray(`Domain ID: ${options.domainId}`))
      console.log(chalk.gray(`Enabled: ${isEnabled}`))
      console.log()

      const alias = await manager.createAlias(options.domainId, options.alias, isEnabled)
      
      console.log(chalk.green('✓ Alias created successfully!'))
      console.log(JSON.stringify({
        id: alias.id,
        aliasName: alias.aliasName,
        fullAddress: alias.fullAddress,
        isEnabled: alias.isEnabled,
        createdAt: alias.createdAt
      }, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to create alias:'), error.message)
      if (error instanceof AliasManagementError) {
        console.error(chalk.gray('Details:'), error.details)
      }
      process.exit(1)
    }
  })

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
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      console.log(chalk.blue('📋 Listing aliases...'))
      console.log()

      const searchOptions = {
        domainId: options.domainId,
        isEnabled: options.enabled ? true : options.disabled ? false : undefined,
        query: options.query,
        limit: parseInt(options.limit),
        offset: parseInt(options.offset)
      }

      const result = await manager.searchAliases(searchOptions)
      
      console.log(chalk.green(`✓ Found ${result.total} aliases`))
      console.log()
      
      if (result.aliases.length === 0) {
        console.log(chalk.yellow('No aliases found'))
      } else {
        result.aliases.forEach(alias => {
          const status = alias.isEnabled ? chalk.green('✓') : chalk.red('✗')
          console.log(`${status} ${alias.fullAddress} (${alias.id})`)
          console.log(chalk.gray(`   Created: ${alias.createdAt.toISOString()}`))
          if (alias.lastEmailReceivedAt) {
            console.log(chalk.gray(`   Last email: ${alias.lastEmailReceivedAt.toISOString()}`))
          }
          console.log()
        })
      }
      
      if (result.hasMore) {
        console.log(chalk.yellow(`... and ${result.total - result.aliases.length} more`))
      }
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to list aliases:'), error.message)
      process.exit(1)
    }
  })

// Validate alias command
program
  .command('validate-alias')
  .description('Validate alias name format and rules')
  .requiredOption('--alias <name>', 'Alias name to validate')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      console.log(chalk.blue(`🔍 Validating alias: ${options.alias}`))
      console.log()

      const result = manager.validateAlias(options.alias)
      
      if (result.valid) {
        console.log(chalk.green('✓ Alias is valid'))
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('Warnings:'))
          result.warnings.forEach(warning => {
            console.log(chalk.yellow(`  - ${warning}`))
          })
        }
      } else {
        console.log(chalk.red('✗ Alias is invalid'))
        console.log(chalk.red('Errors:'))
        result.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`))
        })
        
        if (result.suggestions.length > 0) {
          console.log(chalk.yellow('Suggestions:'))
          result.suggestions.forEach(suggestion => {
            console.log(chalk.yellow(`  - ${suggestion}`))
          })
        }
        process.exit(1)
      }
      
      console.log(JSON.stringify(result, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Validation failed:'), error.message)
      process.exit(1)
    }
  })

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
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      console.log(chalk.blue(`🎲 Generating ${options.count} alias(es)...`))
      console.log(chalk.gray(`Pattern: ${options.pattern}`))
      console.log(chalk.gray(`Length: ${options.length}`))
      console.log()

      const generationOptions = {
        count: parseInt(options.count),
        length: parseInt(options.length),
        pattern: options.pattern as GenerationPattern,
        prefix: options.prefix,
        suffix: options.suffix,
        includeNumbers: options.numbers,
        includeSpecialChars: options.specialChars
      }

      const aliases = manager.generateAliases(generationOptions)
      
      console.log(chalk.green(`✓ Generated ${aliases.length} alias(es)`))
      console.log()
      
      aliases.forEach((alias, index) => {
        console.log(`${index + 1}. ${chalk.cyan(alias)}`)
      })
      
      console.log()
      console.log(JSON.stringify({
        aliases,
        options: generationOptions,
        generated: new Date().toISOString()
      }, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Generation failed:'), error.message)
      process.exit(1)
    }
  })

// Check availability command
program
  .command('check-availability')
  .description('Check if alias is available')
  .requiredOption('--alias <name>', 'Alias name to check')
  .requiredOption('--domain <domain>', 'Domain name')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      console.log(chalk.blue(`🔍 Checking availability: ${options.alias}@${options.domain}`))
      console.log()

      const result = await manager.checkAvailability(options.alias, options.domain)
      
      if (result.available) {
        console.log(chalk.green('✓ Alias is available'))
      } else {
        console.log(chalk.red('✗ Alias is not available'))
        if (result.reason) {
          console.log(chalk.red(`Reason: ${result.reason}`))
        }
        
        if (result.suggestions.length > 0) {
          console.log(chalk.yellow('Suggestions:'))
          result.suggestions.forEach(suggestion => {
            console.log(chalk.yellow(`  - ${suggestion}@${options.domain}`))
          })
        }
        process.exit(1)
      }
      
      console.log(JSON.stringify(result, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Availability check failed:'), error.message)
      process.exit(1)
    }
  })

// Statistics command
program
  .command('stats')
  .description('Get alias statistics')
  .option('--domain-id <id>', 'Filter by domain ID')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const manager = new AliasManagement(config)
      
      console.log(chalk.blue('📊 Getting alias statistics...'))
      console.log()

      const stats = await manager.getStats(options.domainId)
      
      console.log(chalk.green('✓ Statistics retrieved'))
      console.log()
      console.log(`Total aliases: ${chalk.cyan(stats.totalAliases)}`)
      console.log(`Enabled: ${chalk.green(stats.enabledAliases)}`)
      console.log(`Disabled: ${chalk.red(stats.disabledAliases)}`)
      console.log(`With activity: ${chalk.yellow(stats.aliasesWithActivity)}`)
      console.log(`Created today: ${chalk.blue(stats.aliasesCreatedToday)}`)
      console.log(`Created this week: ${chalk.blue(stats.aliasesCreatedThisWeek)}`)
      console.log(`Created this month: ${chalk.blue(stats.aliasesCreatedThisMonth)}`)
      
      console.log()
      console.log(JSON.stringify(stats, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to get statistics:'), error.message)
      process.exit(1)
    }
  })

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    console.log(chalk.blue('Alias Management CLI'))
    console.log(chalk.gray('A library for managing email aliases with validation'))
    console.log()
    console.log(chalk.yellow('Usage:'))
    console.log('  alias-management [command] [options]')
    console.log()
    console.log(chalk.yellow('Commands:'))
    console.log('  create-alias       Create a new email alias')
    console.log('  list-aliases       List email aliases')
    console.log('  validate-alias     Validate alias name format and rules')
    console.log('  generate-alias     Generate random alias names')
    console.log('  check-availability Check if alias is available')
    console.log('  stats             Get alias statistics')
    console.log('  help              Display this help information')
    console.log()
    console.log(chalk.yellow('Global Options:'))
    console.log('  --config <path>        Path to configuration file')
    console.log('  --max-aliases <count>  Maximum aliases per domain')
    console.log('  --max-length <length>  Maximum alias length')
    console.log('  --min-length <length>  Minimum alias length')
    console.log()
    console.log(chalk.yellow('Examples:'))
    console.log('  alias-management create-alias --domain-id abc123 --alias myalias')
    console.log('  alias-management validate-alias --alias test-alias')
    console.log('  alias-management generate-alias --count 5 --pattern readable')
    console.log('  alias-management list-aliases --domain-id abc123 --enabled')
  })

// Helper function to get configuration
async function getConfig(globalOpts: any, commandOpts: any): Promise<AliasManagementConfig> {
  let config: Partial<AliasManagementConfig> = {}
  
  // Load from config file if provided
  if (globalOpts.config) {
    try {
      const fs = await import('fs')
      const configFile = fs.readFileSync(globalOpts.config, 'utf8')
      config = JSON.parse(configFile)
    } catch (error) {
      console.error(chalk.red(`Failed to load config file: ${globalOpts.config}`))
      process.exit(1)
    }
  }
  
  // Override with command line options
  const finalConfig: AliasManagementConfig = {
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
  }
  
  return finalConfig
}

// Parse command line arguments
program.parse()

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
