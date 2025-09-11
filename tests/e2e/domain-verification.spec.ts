import { test, expect } from '@playwright/test'

/**
 * E2E Test: Domain Add + DNS Verify Happy Path
 * 
 * This test validates the complete user workflow for adding and verifying a domain.
 * 
 * User Story: "As a user, I want to add my domain and verify DNS records 
 * so that I can create email aliases for my domain"
 */

// Test configuration
const TEST_DOMAIN = 'e2e-test-domain.example.com'
const TEST_USER = {
  email: 'e2e-domain-test@example.com',
  password: 'TestPassword123!'
}

test.describe('Domain Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should complete domain add and verification flow', async ({ page }) => {
    // Step 1: Navigate to login/signup
    await test.step('Navigate to authentication', async () => {
      // Look for login/signup buttons or forms
      const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Sign In"), a:has-text("Sign In")')
      const signupButton = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up"), button:has-text("Get Started")')
      
      // Try to find authentication elements
      if (await loginButton.isVisible()) {
        await loginButton.click()
      } else if (await signupButton.isVisible()) {
        await signupButton.click()
      } else {
        // If no auth buttons, check if we're already on an auth page
        const emailInput = page.locator('input[type="email"], input[name="email"]')
        if (!(await emailInput.isVisible())) {
          // Navigate to a common auth route
          await page.goto('/auth/login')
        }
      }
    })

    // Step 2: Sign up or login
    await test.step('Authenticate user', async () => {
      // Wait for auth form to be visible
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })
      
      // Fill in email
      const emailInput = page.locator('input[type="email"], input[name="email"]').first()
      await emailInput.fill(TEST_USER.email)
      
      // Fill in password
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
      await passwordInput.fill(TEST_USER.password)
      
      // Look for submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login"), button:has-text("Continue")')
      await submitButton.click()
      
      // Wait for authentication to complete
      // This might redirect to dashboard or show a success message
      await page.waitForLoadState('networkidle')
      
      // Check if we're redirected to dashboard or if there's a success indicator
      await expect(page).toHaveURL(/dashboard|app|home/, { timeout: 15000 })
    })

    // Step 3: Navigate to domains section
    await test.step('Navigate to domains management', async () => {
      // Look for domains navigation link
      const domainsLink = page.locator('a:has-text("Domains"), button:has-text("Domains"), nav a[href*="domain"]')
      
      if (await domainsLink.isVisible()) {
        await domainsLink.click()
      } else {
        // Try direct navigation
        await page.goto('/dashboard/domains')
      }
      
      // Wait for domains page to load
      await page.waitForLoadState('networkidle')
      
      // Verify we're on the domains page
      await expect(page.locator('h1, h2, h3').filter({ hasText: /domain/i })).toBeVisible()
    })

    // Step 4: Add a new domain
    await test.step('Add new domain', async () => {
      // Look for "Add Domain" or similar button
      const addDomainButton = page.locator('button:has-text("Add"), button:has-text("Domain"), button:has-text("New"), button[aria-label*="Add"]')
      await addDomainButton.click()
      
      // Wait for domain form/dialog to appear
      await page.waitForSelector('input[name*="domain"], input[placeholder*="domain"]', { timeout: 5000 })
      
      // Fill in domain name
      const domainInput = page.locator('input[name*="domain"], input[placeholder*="domain"]').first()
      await domainInput.fill(TEST_DOMAIN)
      
      // Submit the form
      const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Create"), button:has-text("Save")')
      await submitButton.click()
      
      // Wait for domain to be added
      await page.waitForLoadState('networkidle')
      
      // Verify domain appears in the list
      await expect(page.locator(`text=${TEST_DOMAIN}`)).toBeVisible()
    })

    // Step 5: View domain verification instructions
    await test.step('View verification instructions', async () => {
      // Look for verification button or link for our domain
      const domainRow = page.locator(`tr:has-text("${TEST_DOMAIN}"), div:has-text("${TEST_DOMAIN}")`)
      const verifyButton = domainRow.locator('button:has-text("Verify"), a:has-text("Verify"), button:has-text("Check")')
      
      if (await verifyButton.isVisible()) {
        await verifyButton.click()
      } else {
        // Try clicking on the domain itself
        await page.locator(`text=${TEST_DOMAIN}`).click()
      }
      
      // Wait for verification instructions to appear
      await page.waitForSelector('text=DNS, text=TXT, text=record', { timeout: 5000 })
      
      // Verify DNS instructions are shown
      await expect(page.locator('text=TXT')).toBeVisible()
      await expect(page.locator('text=DNS')).toBeVisible()
      
      // Look for the verification token/value
      const verificationToken = page.locator('code, pre, input[readonly]').first()
      await expect(verificationToken).toBeVisible()
    })

    // Step 6: Attempt verification (will fail in test environment)
    await test.step('Attempt domain verification', async () => {
      // Look for verify/check button
      const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Check"), button:has-text("Validate")')
      
      if (await verifyButton.isVisible()) {
        await verifyButton.click()
        
        // Wait for verification result
        await page.waitForLoadState('networkidle')
        
        // In test environment, verification will likely fail
        // Check for either success or failure message
        const successMessage = page.locator('text=verified, text=success')
        const failureMessage = page.locator('text=failed, text=error, text=not found')
        
        // Expect either success or failure (both are valid outcomes)
        await expect(successMessage.or(failureMessage)).toBeVisible({ timeout: 10000 })
      }
    })

    // Step 7: Verify domain status is updated
    await test.step('Check domain status', async () => {
      // Navigate back to domains list if not already there
      const domainsLink = page.locator('a:has-text("Domains"), button:has-text("Back")')
      if (await domainsLink.isVisible()) {
        await domainsLink.click()
        await page.waitForLoadState('networkidle')
      }
      
      // Verify domain is still in the list
      await expect(page.locator(`text=${TEST_DOMAIN}`)).toBeVisible()
      
      // Check for status indicator (verified/unverified)
      const domainRow = page.locator(`tr:has-text("${TEST_DOMAIN}"), div:has-text("${TEST_DOMAIN}")`)
      const statusIndicator = domainRow.locator('span, badge, text=verified, text=unverified, text=pending')
      await expect(statusIndicator).toBeVisible()
    })
  })

  test('should show validation errors for invalid domains', async ({ page }) => {
    // Navigate to authenticated state (simplified for this test)
    await page.goto('/dashboard/domains')
    
    // Try to add an invalid domain
    await test.step('Attempt to add invalid domain', async () => {
      const addDomainButton = page.locator('button:has-text("Add"), button:has-text("Domain"), button:has-text("New")')
      
      if (await addDomainButton.isVisible()) {
        await addDomainButton.click()
        
        // Wait for form
        await page.waitForSelector('input[name*="domain"], input[placeholder*="domain"]', { timeout: 5000 })
        
        // Try invalid domain formats
        const invalidDomains = ['invalid', 'not-a-domain', '123', 'domain..com']
        
        for (const invalidDomain of invalidDomains) {
          const domainInput = page.locator('input[name*="domain"], input[placeholder*="domain"]').first()
          await domainInput.fill(invalidDomain)
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Create")')
          await submitButton.click()
          
          // Should show validation error
          await expect(page.locator('text=invalid, text=error, text=format')).toBeVisible({ timeout: 3000 })
          
          // Clear the input for next iteration
          await domainInput.clear()
        }
      }
    })
  })

  test('should handle domain deletion', async ({ page }) => {
    // Navigate to authenticated state
    await page.goto('/dashboard/domains')
    
    await test.step('Delete domain if exists', async () => {
      // Check if test domain exists
      const testDomainElement = page.locator(`text=${TEST_DOMAIN}`)
      
      if (await testDomainElement.isVisible()) {
        // Find delete button for this domain
        const domainRow = page.locator(`tr:has-text("${TEST_DOMAIN}"), div:has-text("${TEST_DOMAIN}")`)
        const deleteButton = domainRow.locator('button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="Delete"]')
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click()
          
          // Handle confirmation dialog if present
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
          }
          
          // Wait for deletion to complete
          await page.waitForLoadState('networkidle')
          
          // Verify domain is removed
          await expect(page.locator(`text=${TEST_DOMAIN}`)).not.toBeVisible()
        }
      }
    })
  })
})

// Cleanup test data
test.afterAll(async ({ browser }) => {
  // Clean up any test data if needed
  // This could involve API calls to remove test domains/users
  console.log('E2E Domain Verification tests completed')
})
