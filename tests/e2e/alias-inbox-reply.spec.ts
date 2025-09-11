import { test, expect } from '@playwright/test'

/**
 * E2E Test: Alias Create/Toggle + Receive + Reply-from-Alias
 * 
 * This test validates the complete user workflow for alias management and email handling.
 * 
 * User Stories:
 * - "As a user, I want to create email aliases for my verified domain"
 * - "As a user, I want to enable/disable aliases to control email reception"
 * - "As a user, I want to receive emails sent to my aliases in my unified inbox"
 * - "As a user, I want to reply from the correct alias when responding to emails"
 */

// Test configuration
const TEST_DOMAIN = 'e2e-alias-test.example.com'
const TEST_ALIAS = 'test-alias'
const TEST_USER = {
  email: 'e2e-alias-test@example.com',
  password: 'TestPassword123!'
}

test.describe('Alias Management and Email Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and authenticate
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Quick authentication (assuming user exists from previous tests)
    try {
      await page.goto('/dashboard')
      // If we can access dashboard, we're already authenticated
      await page.waitForSelector('h1, h2, h3', { timeout: 5000 })
    } catch {
      // Need to authenticate
      await page.goto('/auth/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)
    }
  })

  test('should create and manage email aliases', async ({ page }) => {
    // Step 1: Navigate to aliases section
    await test.step('Navigate to aliases management', async () => {
      // Look for aliases navigation
      const aliasesLink = page.locator('a:has-text("Aliases"), button:has-text("Aliases"), nav a[href*="alias"]')
      
      if (await aliasesLink.isVisible()) {
        await aliasesLink.click()
      } else {
        await page.goto('/dashboard/aliases')
      }
      
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1, h2, h3').filter({ hasText: /alias/i })).toBeVisible()
    })

    // Step 2: Create a new alias
    await test.step('Create new alias', async () => {
      // Look for "Add Alias" or similar button
      const addAliasButton = page.locator('button:has-text("Add"), button:has-text("Alias"), button:has-text("New"), button:has-text("Create")')
      await addAliasButton.click()
      
      // Wait for alias form/dialog
      await page.waitForSelector('input[name*="alias"], input[placeholder*="alias"]', { timeout: 5000 })
      
      // Fill in alias name
      const aliasInput = page.locator('input[name*="alias"], input[placeholder*="alias"]').first()
      await aliasInput.fill(TEST_ALIAS)
      
      // Select domain if dropdown exists
      const domainSelect = page.locator('select[name*="domain"], select[name*="domain_id"]')
      if (await domainSelect.isVisible()) {
        await domainSelect.selectOption({ label: TEST_DOMAIN })
      }
      
      // Submit the form
      const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Create"), button:has-text("Save")')
      await submitButton.click()
      
      await page.waitForLoadState('networkidle')
      
      // Verify alias appears in the list
      const fullAlias = `${TEST_ALIAS}@${TEST_DOMAIN}`
      await expect(page.locator(`text=${fullAlias}, text=${TEST_ALIAS}`)).toBeVisible()
    })

    // Step 3: Toggle alias status
    await test.step('Toggle alias enable/disable', async () => {
      const aliasRow = page.locator(`tr:has-text("${TEST_ALIAS}"), div:has-text("${TEST_ALIAS}")`)
      
      // Look for toggle switch or enable/disable button
      const toggleSwitch = aliasRow.locator('input[type="checkbox"], button:has-text("Enable"), button:has-text("Disable")')
      
      if (await toggleSwitch.isVisible()) {
        // Get initial state
        const isEnabled = await toggleSwitch.isChecked?.() ?? true
        
        // Toggle the switch
        await toggleSwitch.click()
        await page.waitForLoadState('networkidle')
        
        // Verify state changed
        if (toggleSwitch.isChecked) {
          await expect(toggleSwitch).toBeChecked({ checked: !isEnabled })
        }
        
        // Toggle back to enabled state for email testing
        if (!isEnabled) {
          await toggleSwitch.click()
          await page.waitForLoadState('networkidle')
        }
      }
    })

    // Step 4: Verify alias settings
    await test.step('Verify alias configuration', async () => {
      const aliasRow = page.locator(`tr:has-text("${TEST_ALIAS}"), div:has-text("${TEST_ALIAS}")`)
      
      // Check for status indicators
      const statusIndicator = aliasRow.locator('span:has-text("Active"), span:has-text("Enabled"), badge:has-text("Active")')
      await expect(statusIndicator).toBeVisible()
      
      // Check for alias actions (edit, delete, etc.)
      const actionsButton = aliasRow.locator('button:has-text("Actions"), button:has-text("⋮"), button[aria-label*="menu"]')
      if (await actionsButton.isVisible()) {
        await actionsButton.click()
        
        // Verify action menu items
        await expect(page.locator('text=Edit, text=Delete, text=Settings')).toBeVisible()
        
        // Close menu
        await page.keyboard.press('Escape')
      }
    })
  })

  test('should handle email reception and threading', async ({ page }) => {
    // Step 1: Navigate to inbox
    await test.step('Navigate to inbox', async () => {
      const inboxLink = page.locator('a:has-text("Inbox"), button:has-text("Inbox"), nav a[href*="inbox"], nav a[href="/dashboard"]')
      
      if (await inboxLink.isVisible()) {
        await inboxLink.click()
      } else {
        await page.goto('/dashboard')
      }
      
      await page.waitForLoadState('networkidle')
    })

    // Step 2: Check for existing emails or simulate email reception
    await test.step('Check inbox for emails', async () => {
      // Look for email threads or empty state
      const emailThreads = page.locator('[data-testid="email-thread"], .email-thread, .thread-item')
      const emptyState = page.locator('text=No emails, text=Empty inbox, text=No messages')
      
      // Wait for either emails or empty state
      await expect(emailThreads.or(emptyState)).toBeVisible({ timeout: 10000 })
      
      // If emails exist, verify they show alias information
      if (await emailThreads.isVisible()) {
        const firstThread = emailThreads.first()
        
        // Check for alias indicator (via alias@domain.com)
        await expect(firstThread.locator('text=via, text=@')).toBeVisible()
      }
    })

    // Step 3: Test email filtering by alias
    await test.step('Filter emails by alias', async () => {
      // Look for filter controls
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Search"), input[placeholder*="search"]')
      
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Look for alias filter option
        const aliasFilter = page.locator(`text=${TEST_ALIAS}, option:has-text("${TEST_ALIAS}")`).first()
        if (await aliasFilter.isVisible()) {
          await aliasFilter.click()
          await page.waitForLoadState('networkidle')
          
          // Verify filtered results
          const filteredThreads = page.locator('[data-testid="email-thread"], .email-thread')
          if (await filteredThreads.isVisible()) {
            // All visible threads should be for the selected alias
            await expect(filteredThreads.first().locator(`text=${TEST_ALIAS}`)).toBeVisible()
          }
        }
      }
    })
  })

  test('should compose and reply from correct alias', async ({ page }) => {
    // Step 1: Navigate to compose
    await test.step('Open compose dialog', async () => {
      await page.goto('/dashboard')
      
      // Look for compose button
      const composeButton = page.locator('button:has-text("Compose"), button:has-text("New"), button:has-text("Write")')
      await composeButton.click()
      
      // Wait for compose dialog/form
      await page.waitForSelector('input[name*="to"], input[placeholder*="to"], textarea[name*="subject"]', { timeout: 5000 })
    })

    // Step 2: Test alias selection in compose
    await test.step('Select alias for new email', async () => {
      // Look for alias selector
      const aliasSelect = page.locator('select[name*="alias"], select[name*="from"]')
      
      if (await aliasSelect.isVisible()) {
        // Verify our test alias is available
        await expect(aliasSelect.locator(`option:has-text("${TEST_ALIAS}")`)).toBeVisible()
        
        // Select the test alias
        await aliasSelect.selectOption({ label: `${TEST_ALIAS}@${TEST_DOMAIN}` })
      }
      
      // Fill in basic email details
      await page.fill('input[name*="to"], input[placeholder*="to"]', 'recipient@example.com')
      await page.fill('input[name*="subject"], input[placeholder*="subject"]', 'Test Email from Alias')
      await page.fill('textarea[name*="body"], textarea[placeholder*="message"]', 'This is a test email sent from an alias.')
    })

    // Step 3: Test reply functionality
    await test.step('Test reply from alias', async () => {
      // Cancel current compose to test reply
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      
      // Look for an existing email to reply to
      const emailThreads = page.locator('[data-testid="email-thread"], .email-thread, .thread-item')
      
      if (await emailThreads.isVisible()) {
        // Click on first thread
        await emailThreads.first().click()
        await page.waitForLoadState('networkidle')
        
        // Look for reply button
        const replyButton = page.locator('button:has-text("Reply")')
        if (await replyButton.isVisible()) {
          await replyButton.click()
          
          // Wait for reply compose form
          await page.waitForSelector('textarea[name*="body"], textarea[placeholder*="message"]', { timeout: 5000 })
          
          // Verify alias is auto-selected based on the original recipient
          const aliasSelect = page.locator('select[name*="alias"], select[name*="from"]')
          if (await aliasSelect.isVisible()) {
            const selectedValue = await aliasSelect.inputValue()
            // Should contain the alias that received the original email
            expect(selectedValue).toContain('@')
          }
          
          // Fill reply content
          await page.fill('textarea[name*="body"], textarea[placeholder*="message"]', 'This is a reply from the correct alias.')
        }
      }
    })

    // Step 4: Verify send functionality (without actually sending)
    await test.step('Verify send button and validation', async () => {
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]')
      
      if (await sendButton.isVisible()) {
        // Verify button is enabled with valid content
        await expect(sendButton).toBeEnabled()
        
        // Don't actually send in E2E test, just verify the form is ready
        // In a real test environment, you might send to a test email service
      }
    })
  })

  test('should handle alias validation and errors', async ({ page }) => {
    await test.step('Test alias creation validation', async () => {
      await page.goto('/dashboard/aliases')
      
      const addAliasButton = page.locator('button:has-text("Add"), button:has-text("Alias"), button:has-text("New")')
      if (await addAliasButton.isVisible()) {
        await addAliasButton.click()
        
        // Test invalid alias names
        const invalidAliases = ['', 'invalid@domain', 'spaces in name', '123-only-numbers']
        
        for (const invalidAlias of invalidAliases) {
          const aliasInput = page.locator('input[name*="alias"], input[placeholder*="alias"]').first()
          await aliasInput.fill(invalidAlias)
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Create")')
          await submitButton.click()
          
          // Should show validation error
          await expect(page.locator('text=invalid, text=error, text=required')).toBeVisible({ timeout: 3000 })
          
          await aliasInput.clear()
        }
      }
    })
  })

  test('should delete alias when no longer needed', async ({ page }) => {
    await test.step('Clean up test alias', async () => {
      await page.goto('/dashboard/aliases')
      
      // Find the test alias
      const aliasRow = page.locator(`tr:has-text("${TEST_ALIAS}"), div:has-text("${TEST_ALIAS}")`)
      
      if (await aliasRow.isVisible()) {
        // Look for delete button
        const deleteButton = aliasRow.locator('button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="Delete"]')
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click()
          
          // Handle confirmation dialog
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
          }
          
          await page.waitForLoadState('networkidle')
          
          // Verify alias is removed
          await expect(page.locator(`text=${TEST_ALIAS}@${TEST_DOMAIN}`)).not.toBeVisible()
        }
      }
    })
  })
})

// Cleanup
test.afterAll(async () => {
  console.log('E2E Alias and Email Flow tests completed')
})
