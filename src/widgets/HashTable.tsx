import { useId, useState, type FormEvent } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import {
  bucketCount,
  emptyTable,
  hashSnippets,
  insertFrames,
  loadFactor,
  lookupFrames,
  MAX_LOAD,
  type HashFrame,
  type Mode,
  type Table,
} from './hashTable'

const QUICK_KEYS = ['cat', 'act', 'dog', 'fig', 'pear', 'kiwi', 'lime', 'date']

type Run = { id: number; kind: 'insert' | 'lookup'; key: string; frames: HashFrame[] }

export default function HashTable() {
  const [mode, setMode] = useState<Mode>('chaining')
  const [base, setBase] = useState<Table>(() => emptyTable('chaining'))
  const [run, setRun] = useState<Run | null>(null)
  const [input, setInput] = useState('')
  const inputId = useId()

  const frames = run?.frames ?? []
  const p = useFrames(frames.length || 1, run?.id ?? 0)
  const frame = frames[p.index]
  const table = frame?.table ?? base

  function switchMode(m: Mode) {
    setMode(m)
    setBase(emptyTable(m))
    setRun(null)
  }

  function start(kind: Run['kind'], raw: string) {
    const key = raw.trim().toLowerCase().slice(0, 10)
    if (!key) return
    // Each operation starts from where the previous one ended.
    const from = frames.length ? frames.at(-1)!.table : base
    setBase(from)
    setRun({ id: (run?.id ?? 0) + 1, kind, key, frames: kind === 'insert' ? insertFrames(from, key) : lookupFrames(from, key) })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    start('insert', input)
    setInput('')
  }

  const snippet = run?.kind === 'lookup' ? (mode === 'chaining' ? hashSnippets.chainingGet : hashSnippets.probingGet) : hashSnippets[mode]
  const line = frame?.line
  const load = loadFactor(table)

  return (
    <WidgetFrame title="Hash table">
      <div className="mode-tabs" role="group" aria-label="Collision strategy">
        <button type="button" aria-pressed={mode === 'chaining'} onClick={() => switchMode('chaining')}>Chaining</button>
        <button type="button" aria-pressed={mode === 'probing'} onClick={() => switchMode('probing')}>Linear probing</button>
      </div>

      <form className="guess-row" onSubmit={submit}>
        <label htmlFor={inputId} className="visually-hidden">Key</label>
        <input id={inputId} className="text-input" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={10} placeholder="A word" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={!input.trim()}>Insert</button>
        <button type="button" className="btn" disabled={!input.trim()} onClick={() => start('lookup', input)}>Look up</button>
      </form>
      <div className="quick-keys" role="group" aria-label="Quick insert">
        {QUICK_KEYS.map((k) => (
          <button key={k} type="button" className="chip-btn" onClick={() => start('insert', k)}>{k}</button>
        ))}
      </div>

      <div className="load-row small">
        <span>{table.size} keys · {bucketCount(table)} buckets · load <strong>{load.toFixed(2)}</strong></span>
        <div className="load-bar" aria-hidden="true">
          <div className="load-fill" data-over={load > MAX_LOAD} style={{ width: `${Math.min(100, load * 100)}%` }} />
          <div className="load-limit" style={{ left: `${MAX_LOAD * 100}%` }} />
        </div>
      </div>

      {mode === 'chaining' ? (
        <ol className="buckets" aria-label="Buckets">
          {table.chains.map((chain, i) => (
            <li key={i} className={`bucket${frame?.active === i ? ' is-active' : ''}`}>
              <span className="bucket-idx" aria-hidden="true">{i}</span>
              <span className="visually-hidden">Bucket {i}: {chain.length ? chain.join(', ') : 'empty'}</span>
              <span className="chain" aria-hidden="true">
                {chain.map((k, j) => (
                  <span key={j} className={`chain-key${frame?.active === i && frame.chainPos === j ? (frame.outcome === 'found' || frame.outcome === 'placed' || frame.outcome === 'exists' ? ' is-found' : ' is-mid') : ''}`}>{k}</span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="cells slots" aria-label="Slots">
          {table.slots.map((k, i) => (
            <li
              key={i}
              className={`cell${k === null ? ' is-free' : ''}${frame?.active === i ? (frame.outcome && frame.outcome !== 'missing' ? ' is-found' : ' is-mid') : ''}`}
              aria-label={`Slot ${i}: ${k ?? 'empty'}`}
            >
              <span className="cell-tag" aria-hidden="true">{frame?.active === i ? '•' : ''}</span>
              <span className="cell-val cell-word" aria-hidden="true">{k ?? ''}</span>
              <span className="cell-idx" aria-hidden="true">{i}</span>
            </li>
          ))}
        </ol>
      )}

      <StepControls
        onReset={() => {
          p.setPlaying(false)
          setRun(null)
          setBase(emptyTable(mode))
        }}
        onBack={() => p.setIndex(Math.max(0, p.index - 1))}
        onForward={() => p.setIndex(Math.min(frames.length - 1, p.index + 1))}
        canBack={p.index > 0}
        canForward={p.index < frames.length - 1}
        playing={p.playing}
        onTogglePlay={() => p.setPlaying(!p.playing)}
        speed={p.speed}
        onSpeed={p.setSpeed}
        position={frames.length ? `Step ${p.index + 1} of ${frames.length}` : undefined}
      />
      <p className="widget-caption" aria-live="polite">
        {frame?.say ?? 'Insert "cat", then "act": same letters, same toy hash, so they collide. Keep adding words to see the table resize.'}
      </p>
      <CodeBlock snippet={snippet.snippet} highlight={line ? { ts: snippet.lines.ts[line], py: snippet.lines.py[line] } : undefined} />
    </WidgetFrame>
  )
}
