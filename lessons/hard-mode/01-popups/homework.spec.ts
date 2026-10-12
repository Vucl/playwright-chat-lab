import { test } from '../../../e2e/hard-mode/test'

/**
 * Hard mode homework 1 — Popups that get in the way
 *
 * Screen under test: Chat ("/") with `iframe-widget`, `popups` and `latency`
 * on, the same as demo.spec.ts. Hard mode is already turned on for you
 * below — leave the `test.use(...)` line as it is, and don't pin a seed: your
 * test has to pass on all ten.
 *
 * The demo's helpers (`skipCookieBanner`, `closePopupsWhenever`,
 * `openChatWithPopupsOut`, `sendChatMessage`) are yours to copy or rewrite.
 *
 * Complete the exercise below. It's split into two tests — write each one,
 * deleting its `test.fixme()` line once it passes. Then check it on every
 * seed (see the lesson's README):
 *
 *   npm run flake-score -- lessons/hard-mode/01-popups/homework.spec.ts
 */
test.use({ hardMode: { flags: 'iframe-widget, popups, latency' } })

test.describe('Hard mode homework 1: Popups that get in the way', () => {
  /**
   * Test 1 — a choice that sticks, then a form in an iframe
   *   1. Go to "/" and reject cookies: the "We value your privacy" dialog's
   *      "Reject all" button.
   *   2. Check what got stored: `page.evaluate(() => localStorage.getItem(
   *      'chat-lab:hard-mode:consent'))` should be "rejected".
   *   3. Reload and assert the banner stays hidden.
   *   4. Get the "Discount form" iframe's frame (`contentFrame()` or
   *      `page.frameLocator()`). Fill the field labelled "Leave your email
   *      for a 10% discount" with "not-an-email" and assert the "Get
   *      discount" button is disabled. Then fill it with a real-looking
   *      address and assert it's enabled.
   *   5. Click "Get discount". In the "How was your experience?" dialog
   *      (it's inside the iframe too) click "Skip".
   *   6. Assert the frame's status reads "Discount code #NNNN sent." — the
   *      four digits depend on the seed, so use a regular expression.
   */
  test('a rejected banner stays gone, and the discount form works', async () => {
    test.fixme()

    // Write your code here
  })

  /**
   * Test 2 — a long session
   *   1. Skip the cookie banner with `page.addInitScript` (no clicking).
   *   2. Register locator handlers for the promo ("Maybe later") and for each
   *      of the three iframe popups (their close buttons). Count how many
   *      times the promo handler runs. Mind the order: the promo covers the
   *      iframes' close buttons.
   *   3. Install the fake clock, go to "/", wait for the chat input to be
   *      enabled, fast-forward 30 s and send "Gravity always wins".
   *   4. Fast-forward 30 s and send "How odd". Fast-forward 30 s again and
   *      send "If only". (The promo comes back after each jump; your
   *      handler deals with it — no `if` in your test. Replies take up to
   *      4 s: no `waitForTimeout`.)
   *   5. Assert there are 3 "message-user" and 3 "message-assistant"
   *      messages, and that the last reply reads
   *      "If debugging was easy, it would be called “catching butterflies.”"
   *      (note the curly quotes).
   *   6. Assert the promo handler ran 3 times and the page has no iframes
   *      left.
   *   7. Reset the chat, but this time *dismiss* the confirm() dialog.
   *      Assert all 3 user messages are still there.
   */
  test('three messages get through popups that keep showing up', async () => {
    test.fixme()

    // Write your code here
  })
})
