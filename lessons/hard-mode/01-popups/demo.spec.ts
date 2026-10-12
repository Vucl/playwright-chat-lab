import type { Page } from '@playwright/test'
import { expect, test } from '../../../e2e/hard-mode/test'

// Screen under test: Chat ("/") with three flags on at once:
// - `popups`: a cookie banner that blocks the page until you choose, a promo
//   modal ("Upgrade to Chat Lab Pro") that shows up 7–10 s after load and
//   keeps coming back after every close, and a native confirm() on Reset Chat;
// - `iframe-widget`: three forms, each inside its own iframe, that pop up one
//   after another — "Support chat" right away (over the Send button),
//   "Question form" 1.5 s after load (over the nav tabs), "Discount form" 3 s
//   after load (over the chat input and Reset Chat). Each one's close button
//   sits on the page, outside the iframe, and shows up 0 s, 2 s and 4 s after
//   the popup itself;
// - `latency`: every reply takes 0.1–4 s.

// Hard mode is never on by itself: this file turns it on for every test in it.
test.use({ hardMode: { flags: 'iframe-widget, popups, latency' } })

const CONSENT_KEY = 'chat-lab:hard-mode:consent'
const PROMO = 'Upgrade to Chat Lab Pro'
const IFRAME_POPUPS = ['Support chat', 'Question form', 'Discount form']

/** Runs in the page before any of the app's own code, on every load. */
async function skipCookieBanner(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'accepted'), CONSENT_KEY)
}

/**
 * Closes the promo and every iframe popup whenever one is on screen, and
 * records what it closed. The promo goes first: it covers the iframes' close
 * buttons, and a handler can't call another handler for help.
 */
async function closePopupsWhenever(page: Page): Promise<string[]> {
  const closed: string[] = []
  await page.addLocatorHandler(page.getByRole('dialog', { name: PROMO }), async (dialog) => {
    await dialog.getByRole('button', { name: 'Maybe later' }).click()
    closed.push(PROMO)
  })
  for (const title of IFRAME_POPUPS) {
    // click() waits for the close button: it shows up a few seconds late.
    await page.addLocatorHandler(page.getByTitle(title), async () => {
      await page.getByRole('button', { name: `Close ${title.toLowerCase()}` }).click()
      closed.push(title)
    })
  }
  return closed
}

/**
 * Opens the chat on a fake clock and jumps 30 s ahead, so that every popup
 * shows up at once, right now — instead of one by one in the middle of the
 * test. Call closePopupsWhenever() first.
 */
async function openChatWithPopupsOut(page: Page) {
  await page.clock.install()
  await page.goto('/')
  // The app is up and its popup timers are set; now jump past all of them.
  await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 15_000 })
  await page.clock.fastForward(30_000)
}

async function sendChatMessage(page: Page, text: string) {
  const chatInput = page.getByTestId('chat-input')
  const replies = page.getByTestId('message-assistant')
  const before = await replies.count()

  await expect(chatInput).toBeEnabled({ timeout: 15_000 })
  await chatInput.fill(text)
  await page.getByTestId('send-button').click()
  // A reply takes up to 4 s, and the handlers may need a few seconds before
  // it: a longer timeout on the assertion, never a waitForTimeout().
  await expect(replies).toHaveCount(before + 1, { timeout: 15_000 })
}

test.describe('Hard mode 1: Popups that get in the way', () => {
  test('the cookie banner blocks the page until you choose', async ({ page }) => {
    await page.goto('/')

    const banner = page.getByRole('dialog', { name: 'We value your privacy' })
    await expect(banner).toBeVisible({ timeout: 20_000 })

    // The page is right there, but the banner's backdrop catches every click:
    // a trial click (actionability checks only, no click) runs out of time.
    // The "Chat" tab, because no other popup ever covers it.
    await expect(
      page.getByTestId('nav-tab-chat').click({ trial: true, timeout: 2_000 }),
    ).rejects.toThrow(/intercepts pointer events/)

    await banner.getByRole('button', { name: 'Accept all' }).click()
    await expect(banner).toBeHidden()

    // The choice is stored, so the banner doesn't come back after a reload.
    await page.reload()
    await expect(page.getByTestId('chat-input')).toBeVisible()
    await expect(banner).toBeHidden()
  })

  test('page locators stop at the iframe: go through its frame', async ({ page }) => {
    await skipCookieBanner(page)
    await page.goto('/')

    // The form is a whole other document. A page locator doesn't look inside.
    await expect(page.getByTitle('Support chat')).toBeVisible()
    await expect(page.getByLabel('Describe your issue')).toHaveCount(0)

    // contentFrame() turns the <iframe> element into a frame to search in.
    // `page.frameLocator('iframe[title="Support chat"]')` does the same.
    const support = page.getByTitle('Support chat').contentFrame()
    await support.getByLabel('Describe your issue').fill('The Send button is hidden')
    await support.getByRole('button', { name: 'Submit ticket' }).click()

    // The form has a modal of its own — inside the iframe too.
    const rating = support.getByRole('dialog', { name: 'How was your experience?' })
    await rating.getByRole('button', { name: '5' }).click()

    // The ticket number depends on the seed — match its shape, not its value.
    await expect(support.getByRole('status')).toHaveText(/^Ticket #\d{4} created — rated 5\/5\.$/)
  })

  test('a popup catches the clicks meant for the page under it', async ({ page }) => {
    await skipCookieBanner(page)
    await page.goto('/')

    // 1.5 s after load the question form lands on the nav tabs. Clicking
    // through it fails, just like clicking through the cookie banner.
    const historyTab = page.getByTestId('nav-tab-history')
    await expect(page.getByTitle('Question form')).toBeVisible()
    await expect(historyTab.click({ trial: true, timeout: 2_000 })).rejects.toThrow(
      /intercepts pointer events/,
    )

    // The close button is on the page, not in the iframe, so a page locator
    // finds it. It only shows up 2 s after the popup — click() waits for it.
    await page.getByRole('button', { name: 'Close question form' }).click()
    await expect(page.getByTitle('Question form')).toBeHidden()
    await historyTab.click()
    await expect(page).toHaveURL(/\/history$/)
  })

  test('locator handlers close every popup, whenever it shows up', async ({ page }) => {
    await skipCookieBanner(page)
    // Before every action and every auto-waiting assertion, Playwright checks
    // whether a handler's locator is visible and, if so, runs the handler
    // first — however many times it comes back. No `if` in the test.
    const closed = await closePopupsWhenever(page)
    await openChatWithPopupsOut(page)

    // Everything is out now — the promo over all of it — and the handlers
    // clear it before the first step.
    await sendChatMessage(page, 'Cats')
    expect(closed).toHaveLength(4)
    expect(closed).toEqual(expect.arrayContaining([PROMO, ...IFRAME_POPUPS]))

    // One more jump: the iframe popups are closed for good, but the promo
    // comes back — and the same handler closes it again.
    await page.clock.fastForward(30_000)
    await sendChatMessage(page, 'Ducks')
    expect(closed.filter((name) => name === PROMO)).toHaveLength(2)
    await expect(page.locator('iframe')).toHaveCount(0)
  })

  test('Reset Chat asks first, with a native confirm()', async ({ page }) => {
    await skipCookieBanner(page)
    await closePopupsWhenever(page)
    await openChatWithPopupsOut(page)
    await sendChatMessage(page, 'Error')

    // A native dialog isn't in the DOM: no locator finds it. Say what to do
    // with the next one *before* the click that opens it.
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toBe('Reset the chat? Messages on screen will be cleared.')
      await dialog.accept()
    })
    await page.getByTestId('reset-button').click()

    await expect(page.getByTestId('message-user')).toHaveCount(0)
  })
})
