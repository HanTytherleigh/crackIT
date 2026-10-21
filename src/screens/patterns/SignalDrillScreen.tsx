import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loadSignalDrill, patternName, useLoaded, usePatterns } from '../../content/patterns'
import type { Pattern, SignalItem } from '../../content/schema'
import { Prose } from '../../components/Prose'
import { drillCardId } from '../../lib/scheduler'
import { useProgress } from '../../state/progress'
import { DrillShell } from './DrillShell'

export function SignalDrillScreen() {
  const drill = useLoaded(loadSignalDrill)
  const patterns = usePatterns()
  const [index, setIndex] = useState(0)
  if (!drill || !patterns) return <div className="page"><p className="muted" role="status">Loading…</p></div>
  const item = drill.items[index]!

  return (
    <DrillShell
      title="Signal spotting"
      lead="Pick the pattern first, then tick the words that pointed you to it. Some phrases are decoys."
      index={index}
      count={drill.items.length}
      onMove={setIndex}
    >
      <SignalProblem key={item.id} item={item} patterns={patterns} />
    </DrillShell>
  )
}

/** Highlights the cue phrases inside the statement once revealed. */
function MarkedStatement({ item, reveal }: { item: SignalItem; reveal: boolean }) {
  if (!reveal) return <p className="drill-statement">{item.statement}</p>
  const parts: { text: string; cue?: boolean }[] = []
  let rest = item.statement
  const phrases = [...item.candidates].sort((a, b) => item.statement.toLowerCase().indexOf(a.phrase.toLowerCase()) - item.statement.toLowerCase().indexOf(b.phrase.toLowerCase()))
  for (const c of phrases) {
    const at = rest.toLowerCase().indexOf(c.phrase.toLowerCase())
    if (at < 0) continue
    parts.push({ text: rest.slice(0, at) }, { text: rest.slice(at, at + c.phrase.length), cue: c.cue })
    rest = rest.slice(at + c.phrase.length)
  }
  parts.push({ text: rest })
  return (
    <p className="drill-statement">
      {parts.map((p, i) => (p.cue === undefined ? <span key={i}>{p.text}</span> : <mark key={i} className={p.cue ? 'is-cue' : 'is-decoy'}>{p.text}</mark>))}
    </p>
  )
}

function SignalProblem({ item, patterns }: { item: SignalItem; patterns: Pattern[] }) {
  const ensureCard = useProgress((s) => s.ensureCard)
  const [choice, setChoice] = useState<string | null>(null)
  const [ticked, setTicked] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const correct = choice === item.pattern
  const cues = item.candidates.filter((c) => c.cue)
  const caught = cues.filter((c) => ticked.includes(c.phrase)).length
  const decoysTicked = item.candidates.filter((c) => !c.cue && ticked.includes(c.phrase)).length

  function reveal() {
    setRevealed(true)
    // It joins the mixed pattern review, first due tomorrow.
    ensureCard(drillCardId('signal-spotting', item.id))
  }

  return (
    <div className="stack-lg">
      <div className="card">
        <MarkedStatement item={item} reveal={revealed} />
      </div>

      <fieldset className="chip-group" disabled={revealed}>
        <legend>1. Which pattern fits best?</legend>
        {item.options.map((id) => (
          <label key={id} className="chip chip-text">
            <input type="radio" name={`${item.id}-pattern`} checked={choice === id} onChange={() => setChoice(id)} />
            <span>{patternName(patterns, id)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card rubric" disabled={revealed}>
        <legend>2. Which words gave it away?</legend>
        {item.candidates.map((c) => (
          <label key={c.phrase} className="check-row">
            <input
              type="checkbox"
              checked={ticked.includes(c.phrase)}
              onChange={() => setTicked((t) => (t.includes(c.phrase) ? t.filter((x) => x !== c.phrase) : [...t, c.phrase]))}
            />
            <span>
              “{c.phrase}”
              {revealed && <span className={`cue-verdict ${c.cue ? 'is-cue' : 'is-decoy'}`}>{c.cue ? ' cue' : ' decoy'}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      {!revealed ? (
        <button type="button" className="btn btn-primary" disabled={choice === null} onClick={reveal}>Check</button>
      ) : (
        <div className="card stack" aria-live="polite">
          <p className={`feedback ${correct ? 'feedback-ok' : 'feedback-reveal'}`}>
            {correct ? 'Right pattern: ' : 'The pattern is '}
            <Link to={`/patterns/${item.pattern}`}>{patternName(patterns, item.pattern)}</Link>.
          </p>
          <p className="small">
            You ticked {caught} of {cues.length} {cues.length === 1 ? 'cue' : 'cues'}
            {decoysTicked ? ` and ${decoysTicked} ${decoysTicked === 1 ? 'decoy' : 'decoys'}` : ''}.
          </p>
          <Prose text={item.explanation} />
        </div>
      )}
    </div>
  )
}
