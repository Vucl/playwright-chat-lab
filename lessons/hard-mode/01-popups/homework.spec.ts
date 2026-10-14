import { test } from '../../../e2e/hard-mode/test'

/**
 * Hard mode homework 1 — Popups that get in the way
 *
 * Screen under test: Chat ("/") with `iframe-widget`, `popups` and `latency`
 * all on at once: the cookie banner, the promo, the three iframe popups and
 * the confirm() on Reset Chat, plus replies that take 0.1–4 s. Hard mode is
 * already turned on for you below — leave the `test.use(...)` line as it is,
 * and don't pin a seed: your tests have to pass on all ten.
 *
 * The same chat, twice: once getting past every blocker by hand, the way a
 * user would, and once with the tricks that keep them out of the way. The
 * demo's helpers are yours to copy or rewrite.
 *
 * Write each test, deleting its `test.fixme()` line once it passes. Then
 * check them on every seed (see the lesson's README):
 *
 *   npm run flake-score -- lessons/hard-mode/01-popups/homework.spec.ts
 */
test.use({ hardMode: { flags: 'iframe-widget, popups, latency' } })

test.describe('Hard mode homework 1: Popups that get in the way', () => {
  /**
   * Test 1 — by hand. No addInitScript, no locator handlers, no fake clock.
   *   1. Go to "/" and reject cookies: the "We value your privacy" dialog's
   *      "Reject all" button.
   *   2. Check what got stored: `page.evaluate(() => localStorage.getItem(
   *      'chat-lab:hard-mode:consent'))` should be "rejected".
   *   3. Reload and assert the banner stays hidden.
   *   4. Wait for the promo (it shows up 7–10 s after load — pick a timeout,
   *      not a waitForTimeout) and close it with "Maybe later". Do it before
   *      anything else: if it shows up in the middle of a step, it catches
   *      that step's clicks. The next one is at least 14 s away.
   *   5. Get the "Discount form" iframe's frame (`contentFrame()` or
   *      `page.frameLocator()`). Fill the field labelled "Leave your email
   *      for a 10% discount" with "not-an-email" and assert the "Get
   *      discount" button is disabled. Then fill it with a real-looking
   *      address and assert it's enabled.
   *   6. Click "Get discount". In the "How was your experience?" dialog
   *      (it's inside the iframe too) click "Skip".
   *   7. Assert the frame's status reads "Discount code #NNNN sent." — the
   *      four digits depend on the seed, so use a regular expression.
   *   8. Close all three iframe popups with their close buttons, and assert
   *      the page has no iframes left.
   *   9. Send "Gravity always wins" and assert the reply reads
   *      "Gravity is just the Earth being clingy in a scientifically dignified way."
   *  10. Reset the chat: before the click, tell Playwright to check the
   *      confirm()'s text and accept it. Assert there are no messages left.
   */
  test('by hand: every popup closed the way a user would', async () => {
    test.fixme()

    // Write your code here
  })

  /**
   * Test 2 — with tricks. No clicks on the banner, no waiting for popups.
   *   1. Skip the cookie banner with `page.addInitScript` (no clicking).
   *   2. Replace `window.confirm` before the app loads, so that it answers
   *      "OK" without opening a dialog, and keeps the message it was asked.
   *      (Leaving it out won't slip by: with no dialog listener Playwright
   *      clicks "Cancel" for you, and the chat isn't reset.)
   *   3. Register locator handlers for the promo ("Maybe later") and for each
   *      of the three iframe popups (their close buttons). Count how many
   *      times the promo handler runs. Mind the order: the promo covers the
   *      iframes' close buttons.
   *   4. Install the fake clock, go to "/", wait for the chat input to be
   *      enabled, fast-forward 30 s and send "Gravity always wins".
   *   5. Fast-forward 30 s and send "How odd". Fast-forward 30 s again and
   *      send "If only". (The promo comes back after each jump; your
   *      handler deals with it — no `if` in your test. Replies take up to
   *      4 s: no `waitForTimeout`.)
   *   6. Assert there are 3 "message-user" and 3 "message-assistant"
   *      messages, and that the last reply reads
   *      "If debugging was easy, it would be called “catching butterflies.”"
   *      (note the curly quotes).
   *   7. Assert the promo handler ran 3 times and the page has no iframes
   *      left.
   *   8. Click Reset Chat. Your confirm() said "OK": assert there are no
   *      messages left, and that the message it was asked (read it back with
   *      `page.evaluate`) is "Reset the chat? Messages on screen will be
   *      cleared."
   */
  test('with tricks: three messages get through popups that keep showing up', async () => {
    test.fixme()

    // Write your code here
  })
})
