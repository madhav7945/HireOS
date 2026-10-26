// Playwright test: Full Job Posting Flow
// Run with: node test-job-posting-flow.js

const { chromium } = require('playwright')

const BASE_URL = 'http://localhost:5173'

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function testJobPosting() {
  console.log('Starting Playwright test...')
  console.log('Dev server URL:', BASE_URL)

  const browser = await chromium.launch({ headless: false, slowMo: 100 })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // === Step 1: Navigate to Create Job ===
    console.log('Opening job creation page...')
    await page.goto(`${BASE_URL}/jobs/create`)
    await page.waitForSelector('.create-job-page', { timeout: 15000 })
    console.log('Create Job page loaded')

    // Screenshot
    await page.screenshot({ path: 'test-screens/01-start.png' }).catch(() => {})

    // === Step 1: Fill Basic Info ===
    console.log('Filling Step 1: Basic Info')

    const titleInput = page.locator('input[type="text"]').first()
    await titleInput.fill('Senior React Developer')
    console.log('- Title filled')

    // Fill location
    const input2 = page.locator('input[type="text"]').nth(1)
    if (await input2.count() > 0) {
      await input2.fill('Bangalore, India')
      console.log('- Location filled')
    }

    // Fill date
    const dateInput = page.locator('input[type="date"]')
    if (await dateInput.count() > 0) {
      await dateInput.first().fill('2026-12-31')
      console.log('- Date filled')
    }

    // Click Next
    const nextBtn = page.locator('.wizard-nav .btn-primary:has-text("Next")')
    await nextBtn.click()
    await delay(800)
    console.log('- Next clicked')

    await page.screenshot({ path: 'test-screens/02-step2.png' }).catch(() => {})

    // === Step 2: Job Details ===
    console.log('Step 2: Job Details')
    const editor = page.locator('[contenteditable="true"], .ProseMirror').first()
    if (await editor.count() > 0) {
      await editor.fill('Senior React Developer role at our fast-growing startup.')
      console.log('- Description filled')
    }
    await nextBtn.click()
    await delay(800)

    // === Step 3: Screening ===
    console.log('Step 3: Screening')
    await nextBtn.click()
    await delay(800)

    // === Step 4: Application Form ===
    console.log('Step 4: Application Form')
    await nextBtn.click()
    await delay(800)

    // === Step 5: Publish ===
    console.log('Step 5: Publishing - selecting boards')
    const boardCards = await page.locator('.board-card').all()
    console.log(`- Found ${boardCards.length} board cards`)

    if (boardCards.length > 0) {
      for (let i = 0; i < Math.min(3, boardCards.length); i++) {
        try {
          await boardCards[i].click()
          console.log(`- Selected board ${i + 1}`)
        } catch (e) {}
      }
    }

    await nextBtn.click()
    await delay(800)

    // === Step 6: Review & Publish ===
    console.log('Step 6: Review')
    await page.screenshot({ path: 'test-screens/06-review.png' }).catch(() => {})

    // Check agreement
    const checkbox = page.locator('.board-checkbox, input[type="checkbox"]').first()
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click()
      console.log('- Agreement checked')
    }

    // Click Publish
    const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Post"), .review-cta button').first()
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click()
      console.log('- Publish clicked')
    }

    await delay(1500)

    // Check BoardPublisher
    const boardPublisher = page.locator('.board-publisher-overlay, .board-publisher-modal').first()
    const isPublisherVisible = await boardPublisher.isVisible().catch(() => false)

    if (isPublisherVisible) {
      console.log('SUCCESS: BoardPublisher modal appeared!')
      await page.screenshot({ path: 'test-screens/07-boardpublisher.png' }).catch(() => {})
    } else {
      console.log('WARNING: BoardPublisher did NOT appear')
      await page.screenshot({ path: 'test-screens/07-ERROR.png' }).catch(() => {})
    }

    // Console errors
    const logs = await page.evaluate(() => {
      return (window.__errors || []).slice(-10)
    }).catch(() => [])
    console.log('Console errors:', logs.length > 0 ? logs : 'None')

  } catch (error) {
    console.error('TEST FAILED:', error.message)
    await page.screenshot({ path: 'test-screens/ERROR-fail.png' }).catch(() => {})
  } finally {
    await delay(3000)
    await browser.close()
  }
}

testJobPosting().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
