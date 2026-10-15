# Hard mode 1 — Popups that get in the way

## Recap

Lesson 8 had to skip popups and cookie banners: the app in its normal mode
has none. Real products have plenty, and they're among the most common
reasons a test that passed yesterday fails today. This lesson turns them on
with hard mode flags.

`popups` — a set of three flags, each of which can also be turned on alone:

- `cookie-banner`: a **cookie banner** that blocks the whole page until you
  make a choice;
- `promo`: a **promo modal** ("Upgrade to Chat Lab Pro") that shows up
  7–10 s after load and keeps coming back after every close;
- `native-confirm`: a native **`confirm()`** before Reset Chat.

`iframe-widget` — three third-party-style forms, each inside its own
**iframe**, popping up one after another:

| Popup (iframe title) | Shows up | Covers | Close button after |
|---|---|---|---|
| "Support chat" | right away | the Send button | at once |
| "Question form" | 1.5 s after load | the nav tabs (all but Chat) | 2 s |
| "Discount form" | 3 s after load | the chat input and Reset Chat | 4 s |

`latency` — every reply takes 0.1–4 s.

Every blocker can be beaten two ways: **by hand**, the way a user would, or
with a **trick** that keeps it out of the test's way. The demo turns on one
flag at a time and shows both ways for each, then puts all the tricks
together in one last test. The homework turns everything on at once and
asks for both ways.

## Cheat sheet

| Blocker | By hand | Trick |
|---|---|---|
| Cookie banner | Click "Accept all" / "Reject all" | `page.addInitScript` stores the choice in `localStorage` before the app loads — the banner never appears |
| Form inside an iframe | — (no way around it) | `contentFrame()` / `page.frameLocator()`: page locators don't see inside an iframe |
| Iframe popup over the page | Wait for it, click its close button | `page.addLocatorHandler` + `page.clock.fastForward` |
| Promo that comes when it likes | Wait for it with a longer assertion timeout, click "Maybe later" | `page.addLocatorHandler` + `page.clock.fastForward` |
| Native `confirm()` | `page.once('dialog', …)` before the click: check the text, `accept()` / `dismiss()` | `page.addInitScript` replaces `window.confirm` — no dialog at all |
| Slow replies | A longer timeout on the assertion | — (never `waitForTimeout`) |

When to use which:

- **By hand** when the blocker itself is what you're testing: its text,
  its buttons, what its choice does.
- **A trick** in every other test. It's shorter, it doesn't depend on
  timing, and it doesn't break when the popup moves or changes copy.

## Turning hard mode on in a test

Hard mode is never on unless a test asks for it. Import `test` and `expect`
from the hard mode fixture instead of `@playwright/test`, and say which
flags you want:

```ts
import { expect, test } from '../../../e2e/hard-mode/test'

test.use({ hardMode: { flags: 'iframe-widget, popups, latency' } })
```

That turns it on before the app's first load, for every test in the file —
or in the `test.describe` it sits in: the demo turns on only the flag each
group is about (`cookie-banner`, `iframe-widget`, `promo`,
`native-confirm`), so nothing else can get in its way. Leave the seed out: it defaults to 1, and Flake Score
(below) runs your test on every seed from 1 to 10.

The flags decide *what* gets in the way; the seed only decides the numbers
inside it. Here that's when the promo first shows up, how long each reply
takes, and the ticket numbers in the iframe forms. The cookie banner and
the iframe popups look and time the same on every seed.

## Cookie banner

The banner sits on a backdrop that covers the page and catches every click,
so clicking anything behind it waits, then fails with "… intercepts pointer
events".

**By hand** — click it, like a user:

```ts
await page.getByRole('dialog', { name: 'We value your privacy' })
  .getByRole('button', { name: 'Accept all' })
  .click()
```

The choice is stored, so after a reload the banner stays hidden.

**Trick** — the choice is kept in `localStorage`
(`chat-lab:hard-mode:consent`). Set it before the app loads and the banner
never appears:

```ts
await page.addInitScript(
  (key) => localStorage.setItem(key, 'accepted'),
  'chat-lab:hard-mode:consent',
)
```

`addInitScript` runs in the page before any of the app's own code, on every
navigation and reload. Real projects do the same with `storageState` to
skip a login.

To check the banner isn't there, wait for the app first
(`expect(chatInput).toBeVisible()`): right after `goto()` there's no banner
simply because nothing is rendered yet.

## Iframe popups

### A page inside the page: `contentFrame()`

Each popup's form is a whole separate document inside an `<iframe>`. Page
locators stop at its border: `page.getByLabel('Describe your issue')` finds
nothing, even with the form right there on screen. Get the iframe's frame
first, then search inside it:

```ts
const support = page.getByTitle('Support chat').contentFrame()
await support.getByLabel('Describe your issue').fill('The Send button is hidden')
await support.getByRole('button', { name: 'Submit ticket' }).click()
```

`page.frameLocator('iframe[title="Support chat"]')` does the same. Everything
inside goes through that frame, the forms' own "How was your experience?"
modal included. Ticket numbers depend on the seed, so match their shape —
`/^Ticket #\d{4} created/` — not their value.

### By hand: close each one

A popup doesn't have to be a modal to get in the way. The question form
floats over the nav tabs, and a click on "Message history" under it fails
the same way as through the cookie banner: `<iframe title="Question form">
… intercepts pointer events`. Playwright won't click through it — a user
couldn't either. Close it first.

Each popup's close button is on the page, *outside* its iframe, so a plain
page locator finds it:

```ts
await page.getByRole('button', { name: 'Close question form' }).click()
```

It shows up only a while after the popup (2 s here, 4 s for the discount
form). No waiting needed in the test: `click()` waits for the button to
appear before clicking it.

Watch out for `fill()`: unlike `click()`, it doesn't check what's on top of
the field, so it types into the chat input even under the discount form.
The click on Send is where the test stops.

### Trick: locator handlers + fake clock

The same recipe as for the promo: see "Trick for anything that pops up on a
timer" below.

## Promo

You can't click the promo away at a fixed point in the test: it shows up
7–10 s after load (the exact moment depends on the seed), then again after
every close, each time waiting longer (14–20 s). A short test usually
finishes before it appears — and then one day the machine is slower, or the
test grows by two steps, and it doesn't.

**By hand** — wait for it, then close it:

```ts
const promo = page.getByRole('dialog', { name: 'Upgrade to Chat Lab Pro' })
await expect(promo).toBeVisible({ timeout: 15_000 })
await promo.getByRole('button', { name: 'Maybe later' }).click()
```

The default 5 s timeout is too short for 7–10 s; `waitForTimeout(10_000)`
is a guess that wastes time on fast seeds. Do it at the start, before
anything the promo could get in the way of: it has no test id, ignores
Escape and backdrop clicks, and blocks the whole page.

## Trick for anything that pops up on a timer: locator handlers + fake clock

### `page.addLocatorHandler()`

It says what to do *whenever* something shows up:

```ts
const promo = page.getByRole('dialog', { name: 'Upgrade to Chat Lab Pro' })
await page.addLocatorHandler(promo, async (dialog) => {
  await dialog.getByRole('button', { name: 'Maybe later' }).click()
})

// One per iframe popup: whenever it's on screen, click its close button.
await page.addLocatorHandler(page.getByTitle('Discount form'), async () => {
  await page.getByRole('button', { name: 'Close discount form' }).click()
})
```

Before every action and every auto-waiting assertion, Playwright checks
whether the locator is visible and, if so, runs the handler first. No `if`
in your test, and it keeps working for every comeback.

Three things to know:

- **`expect(promo).toBeVisible()` after registering the handler fails** —
  the handler closes the promo before that assertion looks. Count the
  handler's runs instead.
- **Handlers don't help each other.** While one runs, the others are off.
  The promo lies on top of the iframe popups, close buttons included: if it
  shows up while the discount handler is waiting for its close button, that
  click can never land. Register the promo's handler first — handlers run
  in the order they were added — and don't let the promo arrive
  mid-handler (next section). The demo's last test, "Everything at once",
  shows that order.
- **Watch the handler's locator.** It's what Playwright checks; the handler
  is what it does. For the iframe popups, watch the popup and click the
  close button inside the handler: the button turns up late, and `click()`
  waits for it.

### `page.clock`: not waiting for them

The popups' timers are plain `setTimeout`s, so `page.clock` controls them.
`page.clock.install()` before `goto`, then `page.clock.fastForward(30_000)`
jumps 30 s ahead in no time at all: every popup and the promo show up at
once, and the handlers clear them in one go, in their order. Next time the
promo comes back is 14–20 s later — no surprise in the middle of a handler.

```ts
await page.clock.install()
await page.goto('/')
await expect(page.getByTestId('chat-input')).toBeEnabled()
await page.clock.fastForward(30_000)
```

The assertion before the jump matters: it waits until the app is up and
its timers are set. Jump too early and there's nothing to jump past — the
popups then show up on their own, one by one, later on.

## Native `confirm()`

`window.confirm()` opens a native browser dialog. It's not part of the DOM,
so no locator finds it.

**By hand** — Playwright reports it as a `dialog` event. Register a listener
*before* the click that opens it:

```ts
page.once('dialog', async (dialog) => {
  expect(dialog.message()).toBe('Reset the chat? Messages on screen will be cleared.')
  await dialog.accept() // or dialog.dismiss()
})
await page.getByTestId('reset-button').click()
```

With no listener at all, Playwright dismisses dialogs for you — so Reset
Chat silently does nothing, and the test fails somewhere further on, for
no visible reason. `page.once` handles just the next dialog; `page.on`
every one of them.

**Trick** — replace `window.confirm` before the app loads. No dialog opens
at all; your function answers instead:

```ts
await page.addInitScript(() => {
  window.confirm = () => true // "OK"; return false for "Cancel"
})
```

The catch: nothing checks the dialog's text any more. If it matters,
record it in the stub — the demo keeps every message in
`window.confirmsAsked` and reads it back with `page.evaluate`.

## Slow replies: wait longer, not blindly

With `latency` a reply takes up to 4 s, and the default 5 s assertion
timeout leaves no room for a handler or two before it. Give the assertion
more time:

```ts
await expect(page.getByTestId('message-assistant')).toHaveCount(1, { timeout: 15_000 })
```

It still finishes the moment the reply arrives. `page.waitForTimeout(4_000)`
would be both too slow on a fast seed and too short once the test grows —
`e2e/hard-mode/flaky-example.spec.ts` shows a timeout that's too tight
failing on half the seeds.

## Flake Score: checking every seed

A seed decides the scenario: here, when the promo first shows up and how
long each reply takes. Your test runs on seed 1 by default; to check all
ten:

```bash
npm run flake-score -- lessons/hard-mode/01-popups/homework.spec.ts
```

It builds the app, runs the file on seeds 1–10 (twice each) and prints how
many seeds came out stable. A failing seed comes with a ready-made command
to replay it. Aim for 10/10.

To watch a seed by hand, open `/?hard=iframe-widget,popups,latency&seed=3`.
Changing the seed in the ⚙ panel applies at once, but the page doesn't start
over — reload to see that seed from the beginning, the way a test does.

## The screen for this lesson: Chat

The same locators as earlier lessons (`chat-input`, `send-button`,
`message-user`, `message-assistant`, `reset-button`, `nav-tab-history`),
plus:

- Cookie banner: `page.getByRole('dialog', { name: 'We value your privacy' })`,
  buttons "Accept all" and "Reject all".
- Promo: `page.getByRole('dialog', { name: 'Upgrade to Chat Lab Pro' })`,
  buttons "Maybe later" and "Start free trial". It has no test id and
  ignores Escape and backdrop clicks — only its buttons close it.
- Iframe popups: `page.getByTitle('Support chat' | 'Question form' |
  'Discount form')`; close buttons `page.getByRole('button', { name:
  'Close support chat' | 'Close question form' | 'Close discount form' })`.
- Inside the frames: fields labelled "Describe your issue", "What's your
  question?" and "Leave your email for a 10% discount"; buttons "Submit
  ticket", "Send question" and "Get discount" (disabled until the field is
  filled — with a valid email for the discount); the "How was your
  experience?" dialog with buttons "1"–"5" and "Skip"; the result in
  `getByRole('status')`.
- Reset Chat's confirm text: "Reset the chat? Messages on screen will be
  cleared."

## Now

1. Read and run `demo.spec.ts` — four blockers, each beaten by hand and
   with a trick, then all of them at once:

   ```bash
   npx playwright test --config=lessons/playwright.config.ts lessons/hard-mode/01-popups/demo.spec.ts
   ```

2. Open `homework.spec.ts` and write both tests: the same chat with all
   three flags on, once by hand and once with tricks.
3. Run Flake Score on your homework and get it to 10/10.
