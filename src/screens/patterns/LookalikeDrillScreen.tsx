import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadLookalikeDrill, patternName, useLoaded, usePatterns } from '../../content/patterns'
import type { LookalikeItem, Pattern } from '../../content/schema'
import { Prose } from '../../components/Prose'
import { DrillShell } from './DrillShell'

export function LookalikeDrillScreen() {
  const drill = useLoaded(loadLookalikeDrill)
  const patterns = usePatterns()
  const [index, setIndex] = useState(0)
  if (!drill || !patterns) return <div className="page"><p className="muted" role="status">Loading…</p></div>
  const item = drill.items[index]!

  return (
    <DrillShell
      title="Pattern versus look-alike"
      lead="These two problems look alike but need different patterns. Name each one, then explain what tells them apart."
      index={index}
      count={drill.items.length}
      onMove={setIndex}
    >
      <LookalikePair key={item.id} item={item} patterns={patterns} />
    </DrillShell>
  )
}

function LookalikePair({ item, patterns }: { item: LookalikeItem; patterns: Pattern[] }) {
  const id = useId()
  const [picks, setPicks] = useState<{ a: string; b: string }>({ a: '', b: '' })
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [covered, setCovered] = useState<number[]>([])
  const sorted = [...patterns].sort((x, y) => x.name.localeCompare(y.name))

  return (
    <div className="stack-lg">
      {(['a', 'b'] as const).map((side) => {
        const right = picks[side] === item[side].pattern
        return (
          <div key={side} className="card stack">
            <span className="check-num">Problem {side.toUpperCase()}</span>
            <p className="drill-statement">{item[side].statement}</p>
            <label className="small inline-field" htmlFor={`${id}-${side}`}>Pattern</label>
            <select id={`${id}-${side}`} className="select" value={picks[side]} disabled={revealed} onChange={(e) => setPicks({ ...picks, [side]: e.target.value })}>
              <option value="">Choose…</option>
              {sorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {revealed && (
              <p className={`feedback ${right ? 'feedback-ok' : 'feedback-reveal'}`}>
                {right ? 'Right: ' : 'It is '}
                <Link to={`/patterns/${item[side].pattern}`}>{patternName(patterns, item[side].pattern)}</Link>.
              </p>
            )}
          </div>
        )
      })}

      <div className="card">
        <label htmlFor={`${id}-why`} className="field-label">What is the key difference between them?</label>
        <textarea id={`${id}-why`} className="textarea" rows={4} value={text} disabled={revealed} onChange={(e) => setText(e.target.value)} placeholder="Which detail in the wording changes the approach?" />
        {!revealed && (
          <button type="button" className="btn btn-primary" disabled={!picks.a || !picks.b || text.trim().length < 20} onClick={() => setRevealed(true)}>
            Compare with the model answer
          </button>
        )}
      </div>

      {revealed && (
        <div className="stack-lg" aria-live="polite">
          <div className="card stack">
            <h2>Model answer</h2>
            <Prose text={item.difference} />
          </div>
          <fieldset className="card rubric">
            <legend>Tick what your explanation covered</legend>
            {item.rubric.map((point, i) => (
              <label key={i} className="check-row">
                <input type="checkbox" checked={covered.includes(i)} onChange={() => setCovered((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} />
                <span>{point}</span>
              </label>
            ))}
            <p className="small muted" role="status">
              {covered.length === item.rubric.length ? 'All of it. Nicely put.' : `${covered.length} of ${item.rubric.length} covered.`}
            </p>
          </fieldset>
        </div>
      )}
    </div>
  )
}
