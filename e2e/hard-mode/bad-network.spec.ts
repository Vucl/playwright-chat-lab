import type { Page } from '@playwright/test'
import { expect, test } from './test'
import { seedHistory } from './history'

test.use({ hardMode: { flags: 'bad-network' } })

const CHAT = [
  { send: 'Bananas', reply: /^Bananas are just shy yellow kayaks/ },
  { send: 'Cats', reply: /^Cats believe “close enough”/ },
  { send: 'Ducks', reply: /^Ducks think breadcrumbs/ },
  { send: 'Error', reply: /^Error 418/ },
]

const REPLY_TIMEOUT = 15_000

/**
 * flaky-network and rate-limit interrupt at moments no test can predict, so
 * instead of branching on them, register what to do whenever they show up:
 * Playwright runs a handler before any action or assertion that finds its
 * locator on screen.
 */
async function handleInterruptions(page: Page) {
  // A dropped send shows Retry. The network never fails twice in a row, so
  // one press is always enough.
  await page.addLocatorHandler(page.getByRole('button', { name: 'Retry' }), (retry) =>
    retry.click(),
  )
  // Too many sends start a 10 s cooldown. Skip it on the fake clock rather
  // than waiting it out (needs page.clock.install() before the page loads).
  await page.addLocatorHandler(
    page.getByRole('alert').filter({ hasText: 'Too many messages' }),
    () => page.clock.fastForward(10_000),
  )
}

async function send(page: Page, text: string) {
  const input = page.getByPlaceholder('Type a message…')
  await input.fill(text)
  await input.press('Enter')
}

test('every message gets exactly one reply, however the network behaves', async ({ page }) => {
  await page.clock.install()
  await handleInterruptions(page)
  await page.goto('/')

  const replies = page.getByTestId('message-assistant')
  for (const [i, { send: text, reply }] of CHAT.entries()) {
    await send(page, text)
    await expect(replies).toHaveCount(i + 1, { timeout: REPLY_TIMEOUT })
    await expect(replies.nth(i)).toHaveText(reply)
  }

  await expect(page.getByTestId('message-user')).toHaveCount(CHAT.length)
  await expect(page.getByText('Not delivered', { exact: true })).toHaveCount(0)
})

test('a short-lived toast confirms the send', async ({ page }) => {
  await handleInterruptions(page)
  await page.goto('/')
  await send(page, 'Bananas')

  const toast = page.getByRole('status').getByText('Message sent')
  await expect(toast).toBeVisible({ timeout: REPLY_TIMEOUT })
  await expect(toast).toBeHidden()
})

test.describe('a send the network drops', () => {
  test.use({ hardMode: { flags: 'bad-network', seed: 2 } })

  test('is marked as not delivered and goes through on Retry', async ({ page }) => {
    await page.goto('/')
    await send(page, 'Bananas')

    const notDelivered = page.getByText('Not delivered', { exact: true })
    await expect(notDelivered).toBeVisible({ timeout: REPLY_TIMEOUT })
    await page.getByRole('button', { name: 'Retry' }).click()

    await expect(page.getByTestId('message-assistant')).toHaveText(CHAT[0].reply, {
      timeout: REPLY_TIMEOUT,
    })
    await expect(notDelivered).toBeHidden()
    await expect(page.getByTestId('message-user')).toHaveCount(1)
  })
})

test('history loads behind skeletons and pages in on scroll', async ({ page }) => {
  const exchanges = Array.from({ length: 12 }, (_, i) => ({
    user: `Question ${i + 1}`,
    assistant: `Answer ${i + 1}`,
  }))
  await seedHistory(page, exchanges)
  await page.goto('/history')

  await expect(page.getByRole('status', { name: 'Loading history' })).toBeHidden()

  const items = page.getByRole('listitem')
  await expect(async () => {
    await items.last().hover()
    await page.mouse.wheel(0, 2_000)
    await expect(items).toHaveCount(exchanges.length, { timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await expect(page.getByText('Scroll for more')).toBeHidden()
})
