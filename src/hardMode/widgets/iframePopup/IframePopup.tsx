import { useEffect, useState, type CSSProperties } from 'react'
import { useHardMode } from '../../useHardMode'
import { popupPageHtml } from './popupPage'
import { POPUPS, type PopupVariant } from './variants'
import './IframePopup.css'

type Stage = 'waiting' | 'shown' | 'closable' | 'closed'

/**
 * One of the `iframe-widget` popups: appears `showAfter` ms after page load,
 * gets its close button `closeAfter` ms later, and stays closed once closed.
 * Copy, colours, size and timing come from variants.ts.
 */
export default function IframePopup({ variant }: { variant: PopupVariant }) {
  const { rand, emit } = useHardMode()
  const popup = POPUPS[variant]
  const [stage, setStage] = useState<Stage>('waiting')

  // The support form keeps its original rng key so its ticket number stays put.
  const draw = variant === 'support' ? rand('ticket') : rand('ticket', variant)
  const ticket = 1000 + Math.floor(draw * 9000)

  useEffect(() => {
    if (stage === 'waiting') {
      const timer = setTimeout(() => {
        emit('iframe-widget:shown', { variant, afterMs: popup.showAfter })
        setStage('shown')
      }, popup.showAfter)
      return () => clearTimeout(timer)
    }
    if (stage === 'shown') {
      const timer = setTimeout(() => setStage('closable'), popup.closeAfter)
      return () => clearTimeout(timer)
    }
  }, [stage, variant, popup.showAfter, popup.closeAfter, emit])

  if (stage === 'waiting' || stage === 'closed') return null

  const style = {
    '--popup-width': popup.size.width,
    '--popup-height': popup.size.height,
    '--popup-accent': popup.theme.accent,
    '--popup-on-accent': popup.theme.onAccent,
    '--popup-bg': popup.theme.background,
    '--popup-border': popup.theme.border,
  } as CSSProperties

  // The close button sits on the page, outside the iframe, over its corner.
  return (
    <div className={`hm-popup hm-popup--${variant}`} style={style}>
      <iframe
        className="hm-popup__frame"
        title={popup.frameTitle}
        srcDoc={popupPageHtml(popup, ticket)}
      />
      {stage === 'closable' && (
        <button
          type="button"
          className="hm-popup__close"
          aria-label={`Close ${popup.frameTitle.toLowerCase()}`}
          onClick={() => {
            emit('iframe-widget:closed', { variant })
            setStage('closed')
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
