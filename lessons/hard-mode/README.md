# Hard mode track

The main course runs the app in its normal mode. These lessons turn on
[Hard Mode](../../src/HARD_MODE.md) — popups, a bad network, a tricky DOM —
and teach the Playwright tools for each. Start after the main course;
lessons 1–8 are enough.

Every lesson follows the same shape as the main course (`README.md`,
`demo.spec.ts`, `homework.spec.ts`) and runs with the same config:

```bash
npx playwright test --config=lessons/playwright.config.ts lessons/hard-mode/01-popups
```

What's different: a test here must pass on every seed, not just once. A
seed (1–10) doesn't change which popups or failures you get — the flags do —
but when they happen and how long things take ([what each seed
changes](../../src/HARD_MODE.md#seed-and-determinism)). Check it with Flake
Score:

```bash
npm run flake-score -- lessons/hard-mode/01-popups/homework.spec.ts
```

## Lessons

1. [Popups that get in the way](01-popups/README.md) — cookie banner,
   recurring promo, forms in iframes, slow replies, `confirm()`:
   `addInitScript`, `contentFrame()`, `addLocatorHandler`, `page.clock`,
   assertion timeouts, dialog events.

## Submitting homework

Same as the main course ([Submitting homework](../README.md#submitting-homework)),
with one change: once the file is in `e2e/homework-done/<your-name>/`, fix
its import to `../../hard-mode/test`.
