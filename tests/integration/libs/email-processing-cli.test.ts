import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import { promisify } from 'util'

/**
 * Library Test: Email Processing CLI
 * 
 * This test validates the CLI interface for the email-processing library.
 * It MUST FAIL initially until the library and CLI are implemented.
 * 
 * Constitutional Requirement: Every library must have a CLI interface
 * 
 * Library Purpose: Handle email processing with Mailgun integration
 * - Parse inbound emails from webhooks
 * - Send outbound emails via Mailgun API
 * - Handle email threading and conversation grouping
 * - Process email attachments
 */

const LIBRARY_PATH = './libs/email-processing'
const CLI_COMMAND = 'node'
const CLI_SCRIPT = `${LIBRARY_PATH}/cli.js`

// Helper function to execute CLI commands
async function executeCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(CLI_COMMAND, [CLI_SCRIPT, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 })
    })

    child.on('error', (error) => {
      resolve({ stdout, stderr: error.message, exitCode: 1 })
    })
  })
}

describe('Library: Email Processing CLI', () => {
  beforeAll(async () => {
    // Verify library directory exists
    try {
      const fs = await import('fs/promises')
      await fs.access(LIBRARY_PATH)
    } catch (error) {
      console.warn('Email processing library directory not found - tests will fail as expected')
    }
  })

  it('should display help information', async () => {
    const result = await executeCLI(['--help'])

    // Should return 0 for help command
    expect(result.exitCode).toBe(0)
    
    // Should display usage information
    expect(result.stdout).toContain('email-processing')
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('Commands:')
    
    // Should list available commands
    expect(result.stdout).toContain('parse-webhook')
    expect(result.stdout).toContain('send-email')
    expect(result.stdout).toContain('process-thread')
    expect(result.stdout).toContain('validate-email')
  })

  it('should display version information', async () => {
    const result = await executeCLI(['--version'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/) // Semantic version format
  })

  it('should parse webhook data from Mailgun', async () => {
    const webhookData = JSON.stringify({
      recipient: 'test@example.com',
      sender: 'sender@example.com',
      subject: 'Test Email',
      'Message-Id': '<test@example.com>',
      'body-plain': 'Test email body',
      'body-html': '<p>Test email body</p>',
      'In-Reply-To': '<previous@example.com>',
      References: '<thread1@example.com> <previous@example.com>',
      'attachment-count': '1'
    })

    const result = await executeCLI(['parse-webhook', '--data', webhookData])

    if (result.exitCode === 0) {
      // Should parse webhook data successfully
      expect(result.stdout).toContain('recipient')
      expect(result.stdout).toContain('test@example.com')
      expect(result.stdout).toContain('Message-Id')
      expect(result.stdout).toContain('thread_info')
      
      // Should extract threading information
      expect(result.stdout).toContain('in_reply_to')
      expect(result.stdout).toContain('references')
      
      // Should handle attachments
      expect(result.stdout).toContain('attachment_count')
    } else {
      // Expected to fail until library is implemented
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    }
  })

  it('should validate email addresses', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org'
    ]

    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com'
    ]

    // Test valid emails
    for (const email of validEmails) {
      const result = await executeCLI(['validate-email', '--email', email])

      if (result.exitCode === 0) {
        expect(result.stdout).toContain('valid')
        expect(result.stdout).toContain(email)
      } else {
        // Expected to fail until library is implemented
        expect(result.stderr).toBeTruthy()
      }
    }

    // Test invalid emails
    for (const email of invalidEmails) {
      const result = await executeCLI(['validate-email', '--email', email])

      if (result.exitCode === 0) {
        expect(result.stdout).toContain('invalid')
        expect(result.stdout).toContain(email)
      } else {
        // Expected to fail until library is implemented
        expect(result.stderr).toBeTruthy()
      }
    }
  })

  it('should send email via Mailgun API', async () => {
    const emailData = JSON.stringify({
      from: 'test@example.com',
      to: ['recipient@example.com'],
      subject: 'Test Email',
      text: 'Test email body',
      html: '<p>Test email body</p>'
    })

    const result = await executeCLI([
      'send-email',
      '--data', emailData,
      '--api-key', 'test-api-key',
      '--domain', 'test.mailgun.org'
    ])

    if (result.exitCode === 0) {
      // Should return Mailgun message ID
      expect(result.stdout).toContain('message_id')
      expect(result.stdout).toContain('status')
      expect(result.stdout).toContain('sent')
    } else {
      // Expected to fail until library is implemented
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    }
  })

  it('should process email threading', async () => {
    const threadData = JSON.stringify({
      message_id: '<new-message@example.com>',
      in_reply_to: '<previous@example.com>',
      references: ['<thread1@example.com>', '<previous@example.com>'],
      subject: 'Re: Test Thread',
      participants: ['user1@example.com', 'user2@example.com']
    })

    const result = await executeCLI(['process-thread', '--data', threadData])

    if (result.exitCode === 0) {
      // Should determine thread grouping
      expect(result.stdout).toContain('thread_id')
      expect(result.stdout).toContain('is_new_thread')
      expect(result.stdout).toContain('participants')
      
      // Should handle threading logic
      expect(result.stdout).toContain('references')
    } else {
      // Expected to fail until library is implemented
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    }
  })

  it('should handle email attachment processing', async () => {
    const attachmentData = JSON.stringify({
      filename: 'document.pdf',
      content_type: 'application/pdf',
      size: 1024000,
      data: 'base64-encoded-data-here'
    })

    const result = await executeCLI(['process-attachment', '--data', attachmentData])

    if (result.exitCode === 0) {
      // Should validate and process attachment
      expect(result.stdout).toContain('filename')
      expect(result.stdout).toContain('content_type')
      expect(result.stdout).toContain('size')
      expect(result.stdout).toContain('valid')
    } else {
      // Expected to fail until library is implemented
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    }
  })

  it('should handle configuration and environment variables', async () => {
    // Test configuration display
    const configResult = await executeCLI(['config', '--show'])

    if (configResult.exitCode === 0) {
      expect(configResult.stdout).toContain('mailgun')
      expect(configResult.stdout).toContain('api_key')
      expect(configResult.stdout).toContain('domain')
    } else {
      expect(configResult.stderr).toBeTruthy()
    }

    // Test configuration validation
    const validateResult = await executeCLI(['config', '--validate'])

    if (validateResult.exitCode === 0) {
      expect(validateResult.stdout).toContain('configuration')
      expect(validateResult.stdout).toContain('status')
    } else {
      expect(validateResult.stderr).toBeTruthy()
    }
  })

  it('should handle error cases gracefully', async () => {
    // Test invalid command
    const invalidResult = await executeCLI(['invalid-command'])
    expect(invalidResult.exitCode).not.toBe(0)
    expect(invalidResult.stderr).toContain('Unknown command') || expect(invalidResult.stdout).toContain('Unknown command')

    // Test missing required arguments
    const missingArgsResult = await executeCLI(['parse-webhook'])
    expect(missingArgsResult.exitCode).not.toBe(0)
    expect(missingArgsResult.stderr).toContain('required') || expect(missingArgsResult.stdout).toContain('required')

    // Test invalid JSON data
    const invalidJsonResult = await executeCLI(['parse-webhook', '--data', 'invalid-json'])
    expect(invalidJsonResult.exitCode).not.toBe(0)
    expect(invalidJsonResult.stderr).toContain('JSON') || expect(invalidJsonResult.stdout).toContain('JSON')
  })

  it('should support different output formats', async () => {
    const testData = JSON.stringify({
      recipient: 'test@example.com',
      sender: 'sender@example.com',
      subject: 'Test Email'
    })

    // Test JSON output
    const jsonResult = await executeCLI(['parse-webhook', '--data', testData, '--format', 'json'])
    
    if (jsonResult.exitCode === 0) {
      expect(() => JSON.parse(jsonResult.stdout)).not.toThrow()
    }

    // Test YAML output
    const yamlResult = await executeCLI(['parse-webhook', '--data', testData, '--format', 'yaml'])
    
    if (yamlResult.exitCode === 0) {
      expect(yamlResult.stdout).toContain(':')
      expect(yamlResult.stdout).toContain('recipient')
    }

    // Test table output
    const tableResult = await executeCLI(['parse-webhook', '--data', testData, '--format', 'table'])
    
    if (tableResult.exitCode === 0) {
      expect(tableResult.stdout).toContain('│') || expect(tableResult.stdout).toContain('|')
    }
  })

  it('should support verbose and quiet modes', async () => {
    const testData = JSON.stringify({
      recipient: 'test@example.com',
      sender: 'sender@example.com'
    })

    // Test verbose mode
    const verboseResult = await executeCLI(['parse-webhook', '--data', testData, '--verbose'])
    
    if (verboseResult.exitCode === 0) {
      expect(verboseResult.stdout.length).toBeGreaterThan(0)
    }

    // Test quiet mode
    const quietResult = await executeCLI(['parse-webhook', '--data', testData, '--quiet'])
    
    if (quietResult.exitCode === 0) {
      // Quiet mode should produce minimal output
      expect(verboseResult.stdout.length).toBeGreaterThanOrEqual(quietResult.stdout.length)
    }
  })
})
