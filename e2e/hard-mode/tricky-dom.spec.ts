import type { Page } from '@playwright/test'
import { expect, test } from './test'
import { seedHistory } from './history'

// Reference tests for the `tricky-dom` set: unstable-dom, no-testids,
// moving-target, iframe-widget and shadow-dom at once. No test id is left
// to lean on, so everything is found the way a user finds it — by role,
// label, placeholder or text.

test.use({ hardMode: { flags: 'tricky-dom' } })

const HISTORY = [
  { user: 'Bananas, please', assistant: 'Bananas are just shy yellow kayaks.' },
  { user: 'Tell me about cats', assistant: 'Cats believe close enough is a release strategy.' },
  { user: 'Why bananas?', assistant: 'Because bananas never learned to swim.' },
]

/**
 * The "Ask us" form floats over the nav tabs (all but Chat). Its close
 * button only appears after 2 s; click() waits for it.
 */
async function closeQuestionForm(page: Page) {
  await page.getByRole('button', { name: 'Close question form' }).click()
}

/**
 * The support form sits over the bottom right of the chat — the tip over
 * Send and the feedback buttons included. Clicking through it fails with
 * "<iframe> intercepts pointer events"; close it instead.
 */
async function closeSupportForm(page: Page) {
  await page.getByRole('button', { name: 'Close support chat' }).click()
}

test('the app has no test ids to lean on', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Reset Chat' })).toBeVisible()

  // Only the hard mode controls keep theirs, so a test can always get out.
  await expect(page.locator('[data-testid]:not([data-testid^="hard-mode"])')).toHaveCount(0)
})

test('sends with the button once the tip is out of the way', async ({ page }) => {
  await page.goto('/')
  await closeSupportForm(page)
  await page.getByPlaceholder('Type a message…').fill('Bananas')

  // A tip covers the Send button until dismissed, and the button slides in
  // as it becomes enabled. Clicking through the tip would fail just like
  // clicking through the support form; the slide-in, click() waits out.
  await page.getByRole('button', { name: 'Dismiss tip' }).click()
  await page.getByRole('button', { name: 'Send', exact: true }).click()

  await expect(page.getByText(/^Bananas are just shy yellow kayaks/)).toBeVisible()
})

test('files a support ticket inside the iframe', async ({ page }) => {
  await page.goto('/')

  // Page locators can't see into an iframe; go through its frame.
  const support = page.getByTitle('Support chat').contentFrame()
  await support.getByLabel('Describe your issue').fill('The Send button keeps moving')
  await support.getByRole('button', { name: 'Submit ticket' }).click()

  // The form has a modal of its own.
  const rating = support.getByRole('dialog', { name: 'How was your experience?' })
  await rating.getByRole('button', { name: '5' }).click()

  // The ticket number depends on the seed — match its shape, not its value.
  await expect(support.getByRole('status')).toHaveText(/^Ticket #\d{4} created — rated 5\/5\.$/)
})

test('answers the feedback widget in its shadow root', async ({ page }) => {
  await page.goto('/')
  await closeSupportForm(page)

  // Role and text locators pierce open shadow roots (XPath doesn't).
  await page.getByRole('button', { name: '👍 Yes' }).click()
  await expect(page.getByText('Thanks for your feedback!')).toBeVisible()
})

test('finds messages in search, whatever order they come back in', async ({ page }) => {
  await seedHistory(page, HISTORY)
  await page.goto('/')
  await closeQuestionForm(page)
  await page.getByRole('link', { name: 'Search' }).click()

  await page.getByRole('searchbox', { name: 'Search' }).fill('bananas')

  // Results come back shuffled (a different order per seed and query), so
  // pick them by content, never by position.
  const results = page.getByRole('listitem')
  await expect(results).toHaveCount(2)
  await expect(results.filter({ hasText: 'Bananas, please' })).toContainText('yellow kayaks')
  await expect(results.filter({ hasText: 'Why bananas?' })).toContainText('never learned to swim')
})

test('reads history while the list re-mounts under it', async ({ page }) => {
  await seedHistory(page, HISTORY)
  await page.clock.install()
  await page.goto('/')
  await closeQuestionForm(page)
  await page.getByRole('link', { name: 'Message history' }).click()

  const cats = page.getByRole('listitem').filter({ hasText: 'Tell me about cats' })
  await expect(cats).toContainText('release strategy')

  // The list re-mounts every 3 s: every element in it is replaced. A locator
  // is a query, not an element, so it simply finds the new one.
  await page.clock.fastForward(3_500)
  await expect(cats).toContainText('release strategy')
  await expect(page.getByRole('listitem')).toHaveCount(HISTORY.length)
})
