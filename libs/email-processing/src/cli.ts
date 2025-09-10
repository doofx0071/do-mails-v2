#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { EmailProcessing } from './index'
import { 
  EmailProcessingConfig, 
  SendEmailRequest,
  EmailProcessingError 
} from './types'

const program = new Command()

// CLI version and description
program
  .name('email-processing')
  .description('Email processing library with Mailgun integration')
  .version('1.0.0')

// Global options
program
  .option('--api-key <key>', 'Mailgun API key')
  .option('--domain <domain>', 'Mailgun domain')
  .option('--base-url <url>', 'Mailgun base URL', 'https://api.mailgun.net')
  .option('--webhook-key <key>', 'Mailgun webhook signing key')
  .option('--config <path>', 'Path to configuration file')

// Parse webhook command
program
  .command('parse-webhook')
  .description('Parse inbound email webhook from Mailgun')
  .option('--data <json>', 'Webhook data as JSON string')
  .option('--file <path>', 'Path to file containing webhook data')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const processor = new EmailProcessing(config)
      
      let webhookData
      if (options.data) {
        webhookData = JSON.parse(options.data)
      } else if (options.file) {
        const fs = await import('fs')
        const fileContent = fs.readFileSync(options.file, 'utf8')
        webhookData = JSON.parse(fileContent)
      } else {
        console.error(chalk.red('Error: Must provide either --data or --file'))
        process.exit(1)
      }

      const message = await processor.processInboundWebhook(webhookData)
      
      console.log(chalk.green('✓ Webhook parsed successfully'))
      console.log(JSON.stringify({
        id: message.id,
        messageId: message.messageId,
        from: message.from,
        to: message.to,
        subject: message.subject,
        receivedAt: message.receivedAt,
        hasText: !!message.bodyText,
        hasHtml: !!message.bodyHtml,
        attachmentCount: message.attachments.length
      }, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to parse webhook:'), error.message)
      if (error instanceof EmailProcessingError) {
        console.error(chalk.gray('Details:'), error.details)
      }
      process.exit(1)
    }
  })

// Send email command
program
  .command('send-email')
  .description('Send email via Mailgun API')
  .option('--data <json>', 'Email data as JSON string')
  .option('--file <path>', 'Path to file containing email data')
  .option('--from <email>', 'From email address')
  .option('--to <emails>', 'To email addresses (comma-separated)')
  .option('--subject <subject>', 'Email subject')
  .option('--text <text>', 'Plain text content')
  .option('--html <html>', 'HTML content')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const processor = new EmailProcessing(config)
      
      let emailRequest: SendEmailRequest
      
      if (options.data) {
        emailRequest = JSON.parse(options.data)
      } else if (options.file) {
        const fs = await import('fs')
        const fileContent = fs.readFileSync(options.file, 'utf8')
        emailRequest = JSON.parse(fileContent)
      } else {
        // Build request from individual options
        if (!options.from || !options.to || !options.subject) {
          console.error(chalk.red('Error: Must provide --from, --to, and --subject'))
          process.exit(1)
        }
        
        emailRequest = {
          from: options.from,
          to: options.to.split(',').map((email: string) => email.trim()),
          subject: options.subject,
          text: options.text,
          html: options.html
        }
      }

      const response = await processor.sendEmail(emailRequest)
      
      console.log(chalk.green('✓ Email sent successfully'))
      console.log(JSON.stringify({
        message_id: response.id,
        status: response.status,
        message: response.message
      }, null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to send email:'), error.message)
      if (error instanceof EmailProcessingError) {
        console.error(chalk.gray('Details:'), error.details)
      }
      process.exit(1)
    }
  })

// Process thread command
program
  .command('process-thread')
  .description('Group messages into email threads')
  .option('--data <json>', 'Messages data as JSON string')
  .option('--file <path>', 'Path to file containing messages data')
  .action(async (options) => {
    try {
      const config = await getConfig(program.opts(), options)
      const processor = new EmailProcessing(config)
      
      let messages
      if (options.data) {
        messages = JSON.parse(options.data)
      } else if (options.file) {
        const fs = await import('fs')
        const fileContent = fs.readFileSync(options.file, 'utf8')
        messages = JSON.parse(fileContent)
      } else {
        console.error(chalk.red('Error: Must provide either --data or --file'))
        process.exit(1)
      }

      const threads = processor.groupIntoThreads(messages)
      
      console.log(chalk.green(`✓ Grouped ${messages.length} messages into ${threads.length} threads`))
      console.log(JSON.stringify(threads.map(thread => ({
        id: thread.id,
        subject: thread.subject,
        messageCount: thread.messageCount,
        participants: thread.participants,
        lastMessageAt: thread.lastMessageAt
      })), null, 2))
    } catch (error: any) {
      console.error(chalk.red('✗ Failed to process threads:'), error.message)
      process.exit(1)
    }
  })

// Validate email command
program
  .command('validate-email')
  .description('Validate email address format')
  .argument('<email>', 'Email address to validate')
  .action(async (email) => {
    try {
      const config = await getConfig(program.opts(), {})
      const processor = new EmailProcessing(config)
      
      const isValid = processor.validateEmail(email)
      
      if (isValid) {
        console.log(chalk.green(`✓ Email address is valid: ${email}`))
        process.exit(0)
      } else {
        console.log(chalk.red(`✗ Email address is invalid: ${email}`))
        process.exit(1)
      }
    } catch (error: any) {
      console.error(chalk.red('✗ Validation error:'), error.message)
      process.exit(1)
    }
  })

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    console.log(chalk.blue('Email Processing CLI'))
    console.log(chalk.gray('A library for processing emails with Mailgun integration'))
    console.log()
    console.log(chalk.yellow('Usage:'))
    console.log('  email-processing [command] [options]')
    console.log()
    console.log(chalk.yellow('Commands:'))
    console.log('  parse-webhook    Parse inbound email webhook from Mailgun')
    console.log('  send-email       Send email via Mailgun API')
    console.log('  process-thread   Group messages into email threads')
    console.log('  validate-email   Validate email address format')
    console.log('  help            Display this help information')
    console.log()
    console.log(chalk.yellow('Global Options:'))
    console.log('  --api-key <key>     Mailgun API key')
    console.log('  --domain <domain>   Mailgun domain')
    console.log('  --base-url <url>    Mailgun base URL')
    console.log('  --webhook-key <key> Mailgun webhook signing key')
    console.log('  --config <path>     Path to configuration file')
    console.log()
    console.log(chalk.yellow('Examples:'))
    console.log('  email-processing send-email --from test@example.com --to user@example.com --subject "Test" --text "Hello"')
    console.log('  email-processing parse-webhook --file webhook.json')
    console.log('  email-processing validate-email user@example.com')
  })

// Helper function to get configuration
async function getConfig(globalOpts: any, commandOpts: any): Promise<EmailProcessingConfig> {
  let config: Partial<EmailProcessingConfig> = {}
  
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
  const mailgunConfig = {
    apiKey: globalOpts.apiKey || config.mailgun?.apiKey || process.env.MAILGUN_API_KEY || '',
    domain: globalOpts.domain || config.mailgun?.domain || process.env.MAILGUN_DOMAIN || '',
    baseUrl: globalOpts.baseUrl || config.mailgun?.baseUrl || 'https://api.mailgun.net',
    webhookSigningKey: globalOpts.webhookKey || config.mailgun?.webhookSigningKey || process.env.MAILGUN_WEBHOOK_KEY
  }
  
  if (!mailgunConfig.apiKey || !mailgunConfig.domain) {
    console.error(chalk.red('Error: Mailgun API key and domain are required'))
    console.error(chalk.gray('Provide via --api-key and --domain options, config file, or environment variables'))
    process.exit(1)
  }
  
  return {
    mailgun: mailgunConfig,
    threading: config.threading || {},
    maxAttachmentSize: config.maxAttachmentSize || 25 * 1024 * 1024,
    allowedAttachmentTypes: config.allowedAttachmentTypes || []
  }
}

// Parse command line arguments
program.parse()

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
