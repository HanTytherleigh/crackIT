import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { arrayOpFrames, arraySnippets, type ArrayOp, type Cell } from './arrayOps'
import { StepControls, useFrames, WidgetFrame } from './controls'

const START: { cells: Cell[]; length: number } = { cells: [3, 7, 1, 9, 4, null, null, null], length: 5 }
type Kind = ArrayOp['kind']
const kindLabel: Record<Kind, string> = { read: 'Read', insert: 'Insert', delete: 'Delete', append: 'Append' }

export default function ArrayOps() {
  const [base, setBase] = useState(START)
  const [kind, setKind] = useState<Kind>('insert')
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState<{ id: number; op: ArrayOp; from: typeof START } | null>(null)
  const nextValue = useMemo(() => 10 + ((base.length * 7) % 89), [base.length])

  const frames = useMemo(() => (run ? arrayOpFrames(run.from.cells, run.from.length, run.op) : []), [run])
  const player = useFrames(frames.length || 1, run?.id ?? 0)
  const frame = frames[player.index]
  const shown = frame ? { cells: frame.cells, length: frame.length } : base
  const maxIndex = kind === 'insert' ? base.length : base.length - 1
  const safeIndex = Math.min(index, Math.max(0, maxIndex))

  function start() {
    // Each new operation starts from where the last one finished.
    const from = frames.length ? { cells: frames.at(-1)!.cells, length: frames.at(-1)!.length } : base
    setBase(from)
    const i = Math.min(index, kind === 'insert' ? from.length : from.length - 1)
    const op: ArrayOp =
      kind === 'read' ? { kind, index: i } : kind === 'delete' ? { kind, index: i } : kind === 'insert' ? { kind, index: i, value: nextValue } : { kind, value: nextValue }
    setRun({ id: (run?.id ?? 0) + 1, op, from })
  }

  const snippet = arraySnippets[run?.op.kind ?? kind]
  const line = frame?.line

  return (
    <WidgetFrame title="Array operations">
      <div className="op-form">
        <label className="small inline-field">
          Operation
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {(Object.keys(kindLabel) as Kind[]).map((k) => (
              <option key={k} value={k}>{kindLabel[k]}</option>
            ))}
          </select>
        </label>
        {kind !== 'append' && (
          <label className="small inline-field">
            at index
            <select className="select" value={safeIndex} onChange={(e) => setIndex(Number(e.target.value))}>
              {Array.from({ length: Math.max(0, maxIndex) + 1 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-primary" onClick={start} disabled={(kind === 'delete' || kind === 'read') && base.length === 0}>
          Run
        </button>
      </div>

      <ol className="cells" aria-label={`Array with ${shown.length} items in ${shown.cells.length} slots`}>
        {shown.cells.map((v, i) => {
          const active = frame?.active.includes(i)
          return (
            <li
              key={i}
              className={`cell${i >= shown.length && v === null ? ' is-free' : ''}${active ? ' is-mid' : ''}`}
              aria-label={`Slot ${i}: ${v === null ? 'empty' : v}${active ? ', active' : ''}`}
            >
              <span className="cell-tag" aria-hidden="true">{active ? '•' : ''}</span>
              <span className="cell-val" aria-hidden="true">{v ?? ''}</span>
              <span className="cell-idx" aria-hidden="true">{i}</span>
            </li>
          )
        })}
      </ol>
      <p className="small range-labels">
        <span>Length <strong>{shown.length}</strong> · capacity <strong>{shown.cells.length}</strong></span>
        <span>Moves: <strong>{frame?.moves ?? 0}</strong></span>
      </p>

      <StepControls
        onReset={() => {
          player.setPlaying(false)
          setRun(null)
          setBase(START)
        }}
        onBack={() => player.setIndex(Math.max(0, player.index - 1))}
        onForward={() => player.setIndex(Math.min(frames.length - 1, player.index + 1))}
        canBack={player.index > 0}
        canForward={player.index < frames.length - 1}
        playing={player.playing}
        onTogglePlay={() => player.setPlaying(!player.playing)}
        speed={player.speed}
        onSpeed={player.setSpeed}
        position={frames.length ? `Step ${player.index + 1} of ${frames.length}` : undefined}
      />
      <p className="widget-caption" aria-live="polite">
        {frame?.say ?? 'Pick an operation and press Run. Try inserting at index 0, then at the end, and compare the moves.'}
      </p>
      <CodeBlock snippet={snippet.snippet} highlight={line ? { ts: snippet.lines.ts[line], py: snippet.lines.py[line] } : undefined} />
    </WidgetFrame>
  )
}
