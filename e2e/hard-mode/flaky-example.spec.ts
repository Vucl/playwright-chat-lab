import { expect, test } from './test'

test.use({ hardMode: { flags: 'latency' } })

// eslint-disable-next-line playwright/no-skipped-test -- deliberately flaky, see above
test.skip('gets a reply within 2 s (flaky: too short for latency)', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('chat-input').fill('Bananas')
  await page.getByTestId('send-button').click()
  await expect(page.getByText(/^Bananas are just shy yellow kayaks/)).toBeVisible({
    timeout: 2_000,
  })
})
