import type { Page } from '@playwright/test'
import { expect, test } from '../../../e2e/hard-mode/test'


const CONSENT_KEY = 'chat-lab:hard-mode:consent'
const COOKIE_BANNER = 'We value your privacy'
const PROMO = 'Upgrade to Chat Lab Pro'
const IFRAME_POPUPS = ['Support chat', 'Question form', 'Discount form']
const RESET_CONFIRM = 'Reset the chat? Messages on screen will be cleared.'

/** Runs in the page before any of the app's own code, on every load. */
async function skipCookieBanner(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'accepted'), CONSENT_KEY)
}

/** Closes the promo whenever it's on screen; returns how many times it did. */
async function closePromoWhenever(page: Page): Promise<() => number> {
  let runs = 0
  await page.addLocatorHandler(page.getByRole('dialog', { name: PROMO }), async (dialog) => {
    await dialog.getByRole('button', { name: 'Maybe later' }).click()
    runs++
  })
  return () => runs
}

/** Closes every iframe popup whenever it's on screen; returns what it closed. */
async function closeIframePopupsWhenever(page: Page): Promise<string[]> {
  const closed: string[] = []
  for (const title of IFRAME_POPUPS) {
    await page.addLocatorHandler(page.getByTitle(title), async () => {
      await page.getByRole('button', { name: `Close ${title.toLowerCase()}` }).click()
      closed.push(title)
    })
  }
  return closed
}

/**
 * Opens the chat on a fake clock and jumps 30 s ahead, so that every timed
 * popup shows up at once, right now — instead of one by one in the middle of
 * the test. Register the handlers first.
 */
async function openChatWithPopupsOut(page: Page) {
  await page.clock.install()
  await page.goto('/')
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

  await expect(replies).toHaveCount(before + 1, { timeout: 15_000 })
}

test.describe('Hard mode 1: Popups that get in the way', () => {
  test.describe('Cookie banner', () => {
    test.use({ hardMode: { flags: 'cookie-banner' } })

    test('by hand: the banner blocks the page until you choose', async ({ page }) => {
      await page.goto('/')

      const banner = page.getByRole('dialog', { name: COOKIE_BANNER })
      await expect(banner).toBeVisible({ timeout: 20_000 })

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

    test('trick: store the choice before the app loads', async ({ page }) => {
      await skipCookieBanner(page)
      await page.goto('/')

      await expect(page.getByTestId('chat-input')).toBeVisible()
      await expect(page.getByRole('dialog', { name: COOKIE_BANNER })).toHaveCount(0)

      await page.getByTestId('nav-tab-history').click()
      await expect(page).toHaveURL(/\/history$/)
    })
  })

  test.describe('Iframe popups', () => {
    test.use({ hardMode: { flags: 'iframe-widget' } })

    test('by hand: work inside a frame, close every form', async ({ page }) => {
      await page.goto('/')

      const supportPopup = page.getByTitle('Support chat')
      await expect(supportPopup).toBeVisible()
      await expect(page.getByLabel('Describe your issue')).toHaveCount(0)

      const support = supportPopup.contentFrame()
      await support.getByLabel('Describe your issue').fill('The Send button is hidden')
      await support.getByRole('button', { name: 'Submit ticket' }).click()

      const rating = support.getByRole('dialog', { name: 'How was your experience?' })
      await rating.getByRole('button', { name: '5' }).click()
      await expect(support.getByRole('status')).toHaveText(
        /^Ticket #\d{4} created — rated 5\/5\.$/,
      )

      await page.getByRole('button', { name: 'Close support chat' }).click()
      await expect(supportPopup).toBeHidden()

      const questionPopup = page.getByTitle('Question form')
      const historyTab = page.getByTestId('nav-tab-history')
      await expect(questionPopup).toBeVisible()
      await expect(historyTab.click({ trial: true, timeout: 1_000 })).rejects.toThrow(
        /intercepts pointer events/,
      )
      await page.getByRole('button', { name: 'Close question form' }).click()
      await expect(questionPopup).toBeHidden()

      const discountPopup = page.getByTitle('Discount form')
      await expect(discountPopup).toBeVisible()
      await page.getByRole('button', { name: 'Close discount form' }).click()
      await expect(discountPopup).toBeHidden()

      await expect(page.locator('iframe')).toHaveCount(0)
      await sendChatMessage(page, 'Cats')
      await historyTab.click()
      await expect(page).toHaveURL(/\/history$/)
    })

    test('trick: locator handlers and a fake clock', async ({ page }) => {
      const closed = await closeIframePopupsWhenever(page)
      await openChatWithPopupsOut(page)

      await sendChatMessage(page, 'Cats')
      await expect(page.getByTestId('message-assistant').last()).toHaveText(
        'Cats believe “close enough” is a formal software release strategy.',
      )
      expect(closed).toHaveLength(3)
      expect(closed).toEqual(expect.arrayContaining(IFRAME_POPUPS))
      await expect(page.locator('iframe')).toHaveCount(0)
    })
  })

  test.describe('Promo', () => {
    test.use({ hardMode: { flags: 'promo' } })

    test('by hand: wait for the promo, then close it', async ({ page }) => {
      await page.goto('/')

      const promo = page.getByRole('dialog', { name: PROMO })
      await expect(promo).toBeVisible({ timeout: 15_000 })

      await promo.getByRole('button', { name: 'Maybe later' }).click()
      await expect(promo).toBeHidden()

      await sendChatMessage(page, 'Ducks')
    })

    test('trick: a locator handler, on a fake clock', async ({ page }) => {
      const promoRuns = await closePromoWhenever(page)
      await openChatWithPopupsOut(page)

      await sendChatMessage(page, 'Ducks')
      await expect(page.getByRole('dialog', { name: PROMO })).toBeHidden()
      expect(promoRuns()).toBe(1)
    })
  })

  test.describe('Native confirm()', () => {
    test.use({ hardMode: { flags: 'native-confirm' } })

    test('by hand: answer the dialog through its event', async ({ page }) => {
      await page.goto('/')
      await sendChatMessage(page, 'Error')

      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toBe(RESET_CONFIRM)
        await dialog.accept()
      })
      await page.getByTestId('reset-button').click()

      await expect(page.getByTestId('message-user')).toHaveCount(0)
    })

    test('trick: replace window.confirm before the app loads', async ({ page }) => {
      await page.addInitScript(() => {
        const asked: string[] = []
        Object.assign(window, { confirmsAsked: asked })
        window.confirm = (message) => {
          asked.push(String(message))
          return true
        }
      })
      let nativeDialogs = 0
      page.on('dialog', () => nativeDialogs++)

      await page.goto('/')
      await sendChatMessage(page, 'Error')
      await page.getByTestId('reset-button').click()

      await expect(page.getByTestId('message-user')).toHaveCount(0)
      const asked = await page.evaluate(() => Reflect.get(window, 'confirmsAsked') as string[])
      expect(asked).toEqual([RESET_CONFIRM])
      expect(nativeDialogs).toBe(0)
    })
  })

  test.describe('Everything at once', () => {
    test.use({ hardMode: { flags: 'iframe-widget, popups, latency' } })

    test('all the tricks together, in the right order', async ({ page }) => {
      await skipCookieBanner(page)
      const promoRuns = await closePromoWhenever(page)
      const closed = await closeIframePopupsWhenever(page)
      await openChatWithPopupsOut(page)

      await sendChatMessage(page, 'Cats')
      expect(promoRuns()).toBe(1)
      expect(closed).toHaveLength(3)

      await page.clock.fastForward(30_000)
      await sendChatMessage(page, 'Ducks')
      expect(promoRuns()).toBe(2)
      await expect(page.locator('iframe')).toHaveCount(0)

      page.once('dialog', (dialog) => dialog.accept())
      await page.getByTestId('reset-button').click()
      await expect(page.getByTestId('message-user')).toHaveCount(0)
    })
  })
})
