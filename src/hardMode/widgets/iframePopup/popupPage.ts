import fireGif from '../../../assets/fire-fireball.gif'
import type { PopupConfig } from './variants'

// A self-contained page rendered via srcdoc: its DOM is out of reach of page
// locators, so tests have to go through frameLocator(). It has its own modal
// ("rate us") that pops up after submitting. Sizes are in em off the body
// font, so the whole form scales with the iframe; colours come from the
// popup's theme.
export function popupPageHtml(popup: PopupConfig, ticket: number): string {
  const { theme } = popup
  const field =
    popup.field === 'email'
      ? '<input id="issue" name="email" type="email" autocomplete="email">'
      : '<textarea id="issue" name="issue"></textarea>'
  const done = popup.done.replace('#N', `#${ticket}`)
  // srcdoc frames resolve URLs against the parent page, so Vite's asset URL works.
  const fire = popup.fire ? `<img class="fire" src="${fireGif}" alt="">` : ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  :root { --accent: ${theme.accent}; --on-accent: ${theme.onAccent};
    --bg: ${theme.background}; --surface: ${theme.surface};
    --border: ${theme.border}; --text: ${theme.text}; --muted: ${theme.muted}; }
  * { box-sizing: border-box; }
  /* vh/vw are the iframe's own size: shrink the type when it's squeezed so
     the form always fits without a scrollbar. */
  html { overflow: hidden; }
  body { margin: 0; padding: 0.92em;
    font: min(39px, 6.5vh, 4.5vw)/1.4 system-ui, sans-serif;
    color: var(--text); background: var(--bg); }
  p { margin: 0.6em 0 0; }
  h1 { display: flex; gap: 0.4em; align-items: center; margin: 0 0 0.6em;
    font-size: 1.08em; color: var(--accent); }
  .fire { width: 1.8em; height: 1.8em; margin: -0.4em 0; image-rendering: pixelated; }
  label { display: block; margin-bottom: 0.3em; color: var(--muted); }
  textarea, input { width: 100%; padding: 0.46em;
    border: 1px solid var(--border); border-radius: 0.46em; background: var(--surface);
    color: inherit; font: inherit; }
  textarea:focus, input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  textarea { height: 4.15em; resize: none; }
  button { margin-top: 0.6em; padding: 0.38em 0.77em; border: 1px solid var(--border);
    border-radius: 0.46em; background: var(--surface); color: inherit; font: inherit;
    cursor: pointer; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .overlay { position: fixed; inset: 0; display: flex; align-items: center;
    justify-content: center; background: rgb(0 0 0 / 70%); }
  .dialog { width: 85%; padding: 0.92em; border: 1px solid var(--border);
    border-radius: 0.6em; background: var(--surface); }
  .dialog h2 { margin: 0 0 0.46em; font-size: 1em; }
  .stars button { margin-right: 0.3em; }
  [hidden] { display: none !important; }
</style></head><body>
  <h1>${fire}${popup.heading}</h1>
  <form id="form">
    <label for="issue">${popup.label}</label>
    ${field}
    <button type="submit" class="primary" id="submit" disabled>${popup.submit}</button>
  </form>
  <p id="done" role="status" hidden></p>
  <div class="overlay" id="rate" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rate-title">
      <h2 id="rate-title">How was your experience?</h2>
      <div class="stars">
        <button type="button" data-score="1">1</button>
        <button type="button" data-score="2">2</button>
        <button type="button" data-score="3">3</button>
        <button type="button" data-score="4">4</button>
        <button type="button" data-score="5">5</button>
      </div>
      <button type="button" id="skip">Skip</button>
    </div>
  </div>
<script>
  const issue = document.getElementById('issue')
  const submit = document.getElementById('submit')
  const form = document.getElementById('form')
  const rate = document.getElementById('rate')
  const done = document.getElementById('done')
  issue.addEventListener('input', () => {
    submit.disabled = !issue.value.trim() || !issue.checkValidity()
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    rate.hidden = false
  })
  function finish(score) {
    rate.hidden = true
    form.hidden = true
    done.hidden = false
    done.textContent = ${JSON.stringify(done)} + (score ? ' — rated ' + score + '/5' : '') + '.'
  }
  document.querySelectorAll('[data-score]').forEach((b) =>
    b.addEventListener('click', () => finish(b.dataset.score)))
  document.getElementById('skip').addEventListener('click', () => finish(null))
</script>
</body></html>`
}
