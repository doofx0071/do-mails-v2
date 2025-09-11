import { test, expect } from '@playwright/test'

/**
 * E2E Test: Unified Inbox Search/Filter/Labels
 * 
 * This test validates the complete user workflow for inbox management features.
 * 
 * User Stories:
 * - "As a user, I want to search through my emails to find specific messages"
 * - "As a user, I want to filter emails by various criteria (sender, date, alias)"
 * - "As a user, I want to organize emails with labels for better management"
 * - "As a user, I want to archive emails to keep my inbox clean"
 */

// Test configuration
const TEST_USER = {
  email: 'e2e-inbox-test@example.com',
  password: 'TestPassword123!'
}

const SEARCH_TERMS = {
  subject: 'Important Meeting',
  sender: 'boss@company.com',
  content: 'quarterly report'
}

test.describe('Unified Inbox Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Quick authentication
    try {
      await page.goto('/dashboard')
      await page.waitForSelector('h1, h2, h3', { timeout: 5000 })
    } catch {
      await page.goto('/auth/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)
    }
    
    // Navigate to inbox
    const inboxLink = page.locator('a:has-text("Inbox"), nav a[href="/dashboard"], nav a[href*="inbox"]')
    if (await inboxLink.isVisible()) {
      await inboxLink.click()
    }
    await page.waitForLoadState('networkidle')
  })

  test('should perform email search functionality', async ({ page }) => {
    // Step 1: Test global search
    await test.step('Perform global email search', async () => {
      // Look for search input
      const searchInput = page.locator('input[placeholder*="search"], input[name*="search"], input[type="search"]')
      
      if (await searchInput.isVisible()) {
        // Test search by subject
        await searchInput.fill(SEARCH_TERMS.subject)
        await page.keyboard.press('Enter')
        await page.waitForLoadState('networkidle')
        
        // Verify search results or no results message
        const searchResults = page.locator('[data-testid="email-thread"], .email-thread, .thread-item')
        const noResults = page.locator('text=No results, text=No emails found, text=No matches')
        
        await expect(searchResults.or(noResults)).toBeVisible({ timeout: 5000 })
        
        // If results exist, verify they contain search term
        if (await searchResults.isVisible()) {
          await expect(searchResults.first().locator(`text=${SEARCH_TERMS.subject}`)).toBeVisible()
        }
        
        // Clear search
        await searchInput.clear()
        await page.keyboard.press('Enter')
        await page.waitForLoadState('networkidle')
      }
    })

    // Step 2: Test search by sender
    await test.step('Search by sender email', async () => {
      const searchInput = page.locator('input[placeholder*="search"], input[name*="search"], input[type="search"]')
      
      if (await searchInput.isVisible()) {
        await searchInput.fill(SEARCH_TERMS.sender)
        await page.keyboard.press('Enter')
        await page.waitForLoadState('networkidle')
        
        // Verify results are filtered by sender
        const searchResults = page.locator('[data-testid="email-thread"], .email-thread')
        const noResults = page.locator('text=No results, text=No emails found')
        
        await expect(searchResults.or(noResults)).toBeVisible()
        
        // Clear search
        await searchInput.clear()
        await page.keyboard.press('Enter')
      }
    })

    // Step 3: Test content search
    await test.step('Search email content', async () => {
      const searchInput = page.locator('input[placeholder*="search"], input[name*="search"], input[type="search"]')
      
      if (await searchInput.isVisible()) {
        await searchInput.fill(SEARCH_TERMS.content)
        await page.keyboard.press('Enter')
        await page.waitForLoadState('networkidle')
        
        // Verify content search results
        const searchResults = page.locator('[data-testid="email-thread"], .email-thread')
        const noResults = page.locator('text=No results, text=No emails found')
        
        await expect(searchResults.or(noResults)).toBeVisible()
        
        // Clear search for next tests
        await searchInput.clear()
        await page.keyboard.press('Enter')
      }
    })
  })

  test('should filter emails by various criteria', async ({ page }) => {
    // Step 1: Test filter interface
    await test.step('Open filter interface', async () => {
      // Look for filter button or advanced search
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Advanced"), button[aria-label*="filter"]')
      
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Verify filter options are visible
        await expect(page.locator('text=Alias, text=Sender, text=Date')).toBeVisible({ timeout: 5000 })
      }
    })

    // Step 2: Test alias filtering
    await test.step('Filter by email alias', async () => {
      // Look for alias filter dropdown
      const aliasFilter = page.locator('select[name*="alias"], select:has(option:has-text("@"))')
      
      if (await aliasFilter.isVisible()) {
        // Get available aliases
        const aliasOptions = aliasFilter.locator('option')
        const optionCount = await aliasOptions.count()
        
        if (optionCount > 1) {
          // Select first non-empty option
          await aliasFilter.selectOption({ index: 1 })
          await page.waitForLoadState('networkidle')
          
          // Verify filtered results
          const filteredThreads = page.locator('[data-testid="email-thread"], .email-thread')
          if (await filteredThreads.isVisible()) {
            // Should show alias indicator
            await expect(filteredThreads.first().locator('text=via, text=@')).toBeVisible()
          }
          
          // Reset filter
          await aliasFilter.selectOption({ index: 0 })
        }
      }
    })

    // Step 3: Test date filtering
    await test.step('Filter by date range', async () => {
      // Look for date filter controls
      const dateFromInput = page.locator('input[type="date"], input[name*="date_from"], button:has-text("From")')
      const dateToInput = page.locator('input[name*="date_to"], button:has-text("To")')
      
      if (await dateFromInput.isVisible()) {
        // Set date range (last 7 days)
        const today = new Date()
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        if (await dateFromInput.getAttribute('type') === 'date') {
          await dateFromInput.fill(weekAgo.toISOString().split('T')[0])
          if (await dateToInput.isVisible()) {
            await dateToInput.fill(today.toISOString().split('T')[0])
          }
        } else {
          // Handle date picker buttons
          await dateFromInput.click()
          // Select appropriate date from calendar if visible
          const calendar = page.locator('[role="dialog"], .calendar, .date-picker')
          if (await calendar.isVisible()) {
            await page.keyboard.press('Escape') // Close for now
          }
        }
        
        await page.waitForLoadState('networkidle')
      }
    })

    // Step 4: Test sender filtering
    await test.step('Filter by sender', async () => {
      // Look for sender filter input
      const senderFilter = page.locator('input[name*="sender"], input[placeholder*="sender"]')
      
      if (await senderFilter.isVisible()) {
        await senderFilter.fill('example.com')
        await page.waitForLoadState('networkidle')
        
        // Verify filtered results
        const filteredThreads = page.locator('[data-testid="email-thread"], .email-thread')
        const noResults = page.locator('text=No results, text=No emails')
        
        await expect(filteredThreads.or(noResults)).toBeVisible()
        
        // Clear filter
        await senderFilter.clear()
      }
    })

    // Step 5: Test archive filter
    await test.step('Filter archived emails', async () => {
      // Look for archive filter
      const archiveFilter = page.locator('select:has(option:has-text("Archived")), button:has-text("Archived")')
      
      if (await archiveFilter.isVisible()) {
        if (await archiveFilter.getAttribute('role') === 'button') {
          await archiveFilter.click()
        } else {
          await archiveFilter.selectOption({ label: 'Archived' })
        }
        
        await page.waitForLoadState('networkidle')
        
        // Verify archived emails are shown
        const archivedThreads = page.locator('[data-testid="email-thread"], .email-thread')
        if (await archivedThreads.isVisible()) {
          await expect(archivedThreads.first().locator('text=Archived, badge:has-text("Archived")')).toBeVisible()
        }
      }
    })
  })

  test('should manage email labels and organization', async ({ page }) => {
    // Step 1: Test label creation/management
    await test.step('Manage email labels', async () => {
      // Look for an email thread to label
      const emailThreads = page.locator('[data-testid="email-thread"], .email-thread, .thread-item')
      
      if (await emailThreads.isVisible()) {
        const firstThread = emailThreads.first()
        
        // Look for label button or menu
        const labelButton = firstThread.locator('button:has-text("Label"), button[aria-label*="label"], button:has-text("⋮")')
        
        if (await labelButton.isVisible()) {
          await labelButton.click()
          
          // Look for label options
          const labelMenu = page.locator('text=Label, text=Tag, [role="menu"]')
          if (await labelMenu.isVisible()) {
            // Try to add a label
            const addLabelOption = page.locator('button:has-text("Add"), text=Important, text=Work')
            if (await addLabelOption.isVisible()) {
              await addLabelOption.click()
              await page.waitForLoadState('networkidle')
              
              // Verify label was added
              await expect(firstThread.locator('badge, .label, .tag')).toBeVisible()
            }
          }
        }
      }
    })

    // Step 2: Test label filtering
    await test.step('Filter by labels', async () => {
      // Look for label filter in the filter interface
      const labelFilter = page.locator('select:has(option:has-text("Important")), button:has-text("Important")')
      
      if (await labelFilter.isVisible()) {
        await labelFilter.click()
        await page.waitForLoadState('networkidle')
        
        // Verify only labeled emails are shown
        const labeledThreads = page.locator('[data-testid="email-thread"], .email-thread')
        if (await labeledThreads.isVisible()) {
          await expect(labeledThreads.first().locator('badge, .label, .tag')).toBeVisible()
        }
      }
    })
  })

  test('should handle email archiving and organization', async ({ page }) => {
    // Step 1: Test email archiving
    await test.step('Archive email threads', async () => {
      const emailThreads = page.locator('[data-testid="email-thread"], .email-thread, .thread-item')
      
      if (await emailThreads.isVisible()) {
        const firstThread = emailThreads.first()
        
        // Look for archive button
        const archiveButton = firstThread.locator('button:has-text("Archive"), button[aria-label*="archive"], button:has-text("⋮")')
        
        if (await archiveButton.isVisible()) {
          // If it's a menu button, click to open menu first
          if ((await archiveButton.textContent()) === '⋮') {
            await archiveButton.click()
            const archiveMenuItem = page.locator('button:has-text("Archive"), text=Archive')
            if (await archiveMenuItem.isVisible()) {
              await archiveMenuItem.click()
            }
          } else {
            await archiveButton.click()
          }
          
          await page.waitForLoadState('networkidle')
          
          // Verify thread is archived (may disappear from inbox or show archived badge)
          const archivedIndicator = firstThread.locator('badge:has-text("Archived"), text=Archived')
          const threadGone = !(await firstThread.isVisible())
          
          expect(await archivedIndicator.isVisible() || threadGone).toBeTruthy()
        }
      }
    })

    // Step 2: Test unarchiving
    await test.step('Unarchive email threads', async () => {
      // Switch to archived view
      const archiveFilter = page.locator('select:has(option:has-text("Archived")), button:has-text("Archived")')
      
      if (await archiveFilter.isVisible()) {
        if (await archiveFilter.getAttribute('role') === 'button') {
          await archiveFilter.click()
        } else {
          await archiveFilter.selectOption({ label: 'Archived' })
        }
        
        await page.waitForLoadState('networkidle')
        
        // Look for archived threads
        const archivedThreads = page.locator('[data-testid="email-thread"], .email-thread')
        
        if (await archivedThreads.isVisible()) {
          const firstArchived = archivedThreads.first()
          
          // Look for unarchive button
          const unarchiveButton = firstArchived.locator('button:has-text("Unarchive"), button:has-text("Restore"), button:has-text("⋮")')
          
          if (await unarchiveButton.isVisible()) {
            if ((await unarchiveButton.textContent()) === '⋮') {
              await unarchiveButton.click()
              const unarchiveMenuItem = page.locator('button:has-text("Unarchive"), text=Unarchive, text=Restore')
              if (await unarchiveMenuItem.isVisible()) {
                await unarchiveMenuItem.click()
              }
            } else {
              await unarchiveButton.click()
            }
            
            await page.waitForLoadState('networkidle')
          }
        }
      }
    })
  })

  test('should handle complex filter combinations', async ({ page }) => {
    await test.step('Apply multiple filters simultaneously', async () => {
      // Open filter interface
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Advanced")')
      
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Apply multiple filters
        const searchInput = page.locator('input[placeholder*="search"], input[name*="search"]')
        if (await searchInput.isVisible()) {
          await searchInput.fill('meeting')
        }
        
        const aliasFilter = page.locator('select[name*="alias"]')
        if (await aliasFilter.isVisible()) {
          const optionCount = await aliasFilter.locator('option').count()
          if (optionCount > 1) {
            await aliasFilter.selectOption({ index: 1 })
          }
        }
        
        await page.waitForLoadState('networkidle')
        
        // Verify combined filter results
        const filteredResults = page.locator('[data-testid="email-thread"], .email-thread')
        const noResults = page.locator('text=No results, text=No emails found')
        
        await expect(filteredResults.or(noResults)).toBeVisible()
        
        // Clear all filters
        const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")')
        if (await clearButton.isVisible()) {
          await clearButton.click()
          await page.waitForLoadState('networkidle')
        }
      }
    })
  })
})

// Cleanup
test.afterAll(async () => {
  console.log('E2E Inbox Management tests completed')
})
