// The three iframe popups of the `iframe-widget` flag. Everything worth
// tweaking lives here: copy, colours, size and timing. Styles that don't
// differ between popups are in IframePopup.css and popupPage.ts.

export type PopupVariant = 'support' | 'question' | 'discount'

export interface PopupTheme {
  /** Buttons, focus, the frame's border and the close button. */
  accent: string
  /** Text on the accent colour. */
  onAccent: string
  /** Page background inside the iframe. */
  background: string
  /** Fields and the "rate us" dialog. */
  surface: string
  border: string
  text: string
  muted: string
}

export interface PopupConfig {
  frameTitle: string
  heading: string
  label: string
  /** `email` renders a single-line email input instead of a textarea. */
  field: 'textarea' | 'email'
  submit: string
  /** Shown after the "rate us" modal; `#N` is the seeded ticket number. */
  done: string
  /** Shows the animated fireball next to the heading. */
  fire?: boolean
  /** Ms after page load until the popup appears. */
  showAfter: number
  /** Ms after the popup appears until its close button does. */
  closeAfter: number
  /** CSS lengths; each is also capped by the viewport (see IframePopup.css). */
  size: { width: string; height: string }
  theme: PopupTheme
}

/** In the order they appear. */
export const POPUPS: Record<PopupVariant, PopupConfig> = {
  // Small and calm: a helpdesk widget in the bottom right.
  support: {
    frameTitle: 'Support chat',
    heading: 'Support',
    label: 'Describe your issue',
    field: 'textarea',
    submit: 'Submit ticket',
    done: 'Ticket #N created',
    showAfter: 0,
    closeAfter: 0,
    size: { width: '24rem', height: '17rem' },
    theme: {
      accent: '#3b82f6',
      onAccent: '#ffffff',
      background: '#0d1526',
      surface: '#13203a',
      border: '#25406b',
      text: '#e2ebfb',
      muted: '#9fb3d6',
    },
  },
  // Medium and loud: lands on top of the nav tabs.
  question: {
    frameTitle: 'Question form',
    heading: 'Ask us',
    label: "What's your question?",
    field: 'textarea',
    submit: 'Send question',
    done: 'Question #N received',
    fire: true,
    showAfter: 1500,
    closeAfter: 2000,
    size: { width: '28rem', height: '19rem' },
    theme: {
      accent: '#f59e0b',
      onAccent: '#1f1300',
      background: '#1d1608',
      surface: '#2b200c',
      border: '#5c4313',
      text: '#fbf0d9',
      muted: '#d6bf8f',
    },
  },
  // Big and pushy: a discount form in the bottom centre.
  discount: {
    frameTitle: 'Discount form',
    heading: 'Get 10% off',
    label: 'Leave your email for a 10% discount',
    field: 'email',
    submit: 'Get discount',
    done: 'Discount code #N sent',
    fire: true,
    showAfter: 3000,
    closeAfter: 4000,
    size: { width: '32rem', height: '21rem' },
    theme: {
      accent: '#ec4899',
      onAccent: '#ffffff',
      background: '#200c19',
      surface: '#311327',
      border: '#64264f',
      text: '#fbe4f1',
      muted: '#dba6c6',
    },
  },
}

export const POPUP_VARIANTS = Object.keys(POPUPS) as PopupVariant[]
