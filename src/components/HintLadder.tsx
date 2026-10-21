import type { Hint } from '../content/schema'
import { Prose } from './Prose'

const levelLabel: Record<Hint['level'], string> = { nudge: 'Nudge', pattern: 'Pattern', approach: 'Approach' }

/**
 * Hints stay locked until the learner has made an attempt, then open one rung at a time:
 * nudge, then pattern name, then approach. Never the full solution.
 */
export function HintLadder({ hints, shown, unlocked, onShowNext }: {
  hints: Hint[]
  shown: number
  unlocked: boolean
  onShowNext: () => void
}) {
  if (hints.length === 0) return null
  const visible = hints.slice(0, Math.min(shown, hints.length))
  const next = hints[visible.length]

  return (
    <div className="hint-ladder">
      {visible.map((h, i) => (
        <div key={i} className="hint">
          <span className="hint-level">{levelLabel[h.level]}</span>
          <Prose text={h.text} />
        </div>
      ))}
      {next &&
        (unlocked ? (
          <button type="button" className="btn btn-quiet" onClick={onShowNext}>
            {visible.length === 0 ? 'Show a hint' : `Next hint: ${levelLabel[next.level].toLowerCase()}`}
          </button>
        ) : (
          <p className="muted small">Hints open after you've had a go.</p>
        ))}
    </div>
  )
}
