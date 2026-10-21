import { useState } from 'react'
import { complexityAsCheck, loadComplexityDrill, useLoaded } from '../../content/patterns'
import type { CheckRecord } from '../../lib/progressModel'
import { drillCardId } from '../../lib/scheduler'
import { useProgress } from '../../state/progress'
import { CheckCard } from '../../lesson/CheckCard'
import { DrillShell } from './DrillShell'

const fresh = (): { record: CheckRecord; hints: number } => ({ record: { attempts: 0, lastAnswer: '', correct: false, revealed: false }, hints: 0 })

export function ComplexityDrillScreen() {
  const drill = useLoaded(loadComplexityDrill)
  const ensureCard = useProgress((s) => s.ensureCard)
  const [index, setIndex] = useState(0)
  const [state, setState] = useState(fresh)
  if (!drill) return <div className="page"><p className="muted" role="status">Loading…</p></div>
  const item = drill.items[index]!

  function move(to: number) {
    setIndex(to)
    setState(fresh())
  }

  return (
    <DrillShell title="Complexity prediction" lead="Read the approach and predict its time complexity before you see the answer." index={index} count={drill.items.length} onMove={move}>
      <CheckCard
        key={item.id}
        check={complexityAsCheck(item)}
        index={index}
        label="Predict the Big O"
        record={state.record}
        hintsShown={state.hints}
        revealedNote="It will come back in pattern review."
        onAnswer={(value, correct) => {
          ensureCard(drillCardId('complexity-prediction', item.id))
          setState((s) => ({
            ...s,
            record: {
              ...s.record,
              attempts: s.record.attempts + 1,
              lastAnswer: value,
              correct,
              passedAt: s.record.passedAt ?? (correct && !s.record.revealed ? new Date().toISOString() : undefined),
            },
          }))
        }}
        onReveal={() => setState((s) => ({ ...s, record: { ...s.record, revealed: true } }))}
        onHint={() => setState((s) => ({ ...s, hints: s.hints + 1 }))}
      />
    </DrillShell>
  )
}
