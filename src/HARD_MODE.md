# Hard Mode

An opt-in mode that makes Chat Lab behave like a messy real-world product, for
practising realistic Playwright e2e testing. **Off by default.**

## Enabling it

- **UI:** the "Hard mode" toggle in the top-left corner; ⚙ picks flags and the seed.
- **URL:** `/?hard=all&seed=4`, `/?hard=popups,latency&seed=4`, or a
  [flag set](#flag-sets): `/?hard=bad-network`. `?hard=off` turns it off.
- **Persistence:** saved in `localStorage` (`chat-lab:hard-mode`).

Precedence: `?hard=` in the URL → stored config → off.

## Seed

A seed is a number from **1 to 10**. Flags pick *which* trouble is on; the seed
picks the numbers inside it (delays, which sends fail, result order). Same seed
+ same actions = same run. The seed is shown as a "seed N" badge and logged to
the console. With no seed, one is picked at random.

A seed fixes the numbers, not timing relative to the test: a test racing
`latency` or the promo timer can still pass and fail on the same seed.

## Flags

| Flag | What happens | What it trains |
|---|---|---|
| `cookie-banner` | Cookie banner blocks the page until you accept or reject. | `addInitScript`, `storageState` |
| `promo` | A promo modal appears 7–10 s after load and keeps coming back (each gap doubles, up to 20 s). | `addLocatorHandler()`, `page.clock` |
| `native-confirm` | Reset Chat asks with native `confirm()` first. | `page.on('dialog')` |
| `latency` | Replies take 0.1–4 s. | No `waitForTimeout`, assertion timeouts |
| `flaky-network` | Some sends fail with "Not delivered" + Retry. Never twice in a row. | `expect.toPass()`, retry flows |
| `rate-limit` | >3 sends in 10 s → cooldown, input disabled. | `page.clock` |
| `toasts` | Notifications that vanish after 1.5 s. | Short-lived elements |
| `unstable-dom` | History re-mounts every 3 s; search results shuffled. | Locators vs handles, `filter({ hasText })` |
| `no-testids` | All `data-testid` removed. | Role, label, text locators |
| `moving-target` | Send button slides in; a tip covers it until dismissed. | Actionability checks |
| `iframe-widget` | Three popups with forms inside iframes, appearing at 0 / 1.5 / 3 s. | `frameLocator()` |
| `shadow-dom` | `<feedback-widget>` with an open shadow root. | Shadow DOM locators |
| `files` | Attach a file; export history as JSON. | `setInputFiles()`, `waitForEvent('download')` |
| `multi-tab` | History opens in a new window and syncs between tabs. | `context.waitForEvent('page')` |
| `slow-history` | Skeletons, then infinite scroll by 5 items. | Loading states, infinite scroll |
| `time` | "2 minutes ago", Today/Yesterday dividers. | `page.clock`, `timezoneId` / `locale` |
| `clipboard` | Copy button on replies. | `grantPermissions(['clipboard-read'])` |

## Flag sets

| Set | Flags |
|---|---|
| `popups` | `cookie-banner`, `promo`, `native-confirm` |
| `bad-network` | `latency`, `flaky-network`, `rate-limit`, `slow-history`, `toasts` |
| `tricky-dom` | `unstable-dom`, `no-testids`, `moving-target`, `iframe-widget`, `shadow-dom` |

A set's contents never change; `all` grows with new flags. `popups` used to
be a single flag: a stored config that still has it gets the three flags it
was split into.

## Writing a test

```ts
import { expect, test } from '../hard-mode/test'

test.use({ hardMode: { flags: 'bad-network' } }) // optional: seed: 4

test('the message gets through after a network failure', async ({ page }) => {
  // …
})
```

Use the `hardMode` option, not `page.goto('/?hard=…')` — otherwise Flake Score
can't vary the seed. The fixture checks the config on every load and attaches
the hard mode event log to the report on failure.

Tips:

```ts
// Skip the cookie banner
await page.addInitScript(() =>
  localStorage.setItem('chat-lab:hard-mode:consent', 'accepted'),
)

// Dismiss the promo whenever it shows up
const promo = page.getByRole('dialog', { name: 'Upgrade to Chat Lab Pro' })
await page.addLocatorHandler(promo, async (dialog) => {
  await dialog.getByRole('button', { name: 'Maybe later' }).click()
})
```

All app timers use `setTimeout` / `setInterval` / `Date`, so `page.clock`
controls them (CSS animations excluded).

## Flake Score

Runs hard mode tests on every seed (1–10), twice each, and scores the share of
stable seeds:

```bash
npm run flake-score
npm run flake-score -- e2e/hard-mode/bad-network.spec.ts
```

Failures are classified as **seed-dependent** (replay with
`/?hard=<flags>&seed=<n>`), **timing-dependent** (a race — check the trace) or
**fails on every seed** (fix the test first). The report goes to
`flake-score-report/`.

Useful options: `--seeds=<n>`, `--repeats=<n>`, `--min=<percent>`, `--headed`,
`--port=<n>` (if 5173 is busy). On a PR, comment `flake-score` to run it in CI.

## Code layout

| Path | Purpose |
|---|---|
| `hardMode/hardModeConfig.ts` | Flags, URL/storage parsing |
| `hardMode/rng.ts` | Seeded random numbers |
| `hardMode/withHardMode.ts` | Latency, flaky network, rate limit |
| `hardMode/overlays/`, `hardMode/widgets/` | Popups, toasts, iframe and shadow-DOM widgets |
| `../e2e/hard-mode/test.ts` | Test fixture |
| `../scripts/flake-score.ts` | `npm run flake-score` |
