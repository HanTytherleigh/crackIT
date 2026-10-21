import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { dpSnippets, fibFrames, knapsackFrames, KNAPSACK_CAPACITY, KNAPSACK_ITEMS, LCS_A, LCS_B, lcsFrames, type DPMode } from './dpTable'

const modeLabel: Record<DPMode, string> = { fib: 'Fibonacci', knapsack: 'Knapsack', lcs: 'LCS' }

function headers(mode: DPMode): { cols: string[]; rows: string[]; corner: string } {
  switch (mode) {
    case 'fib':
      return { cols: Array.from({ length: 11 }, (_, i) => String(i)), rows: ['fib'], corner: 'i' }
    case 'knapsack':
      return {
        cols: Array.from({ length: KNAPSACK_CAPACITY + 1 }, (_, c) => String(c)),
        rows: ['none', ...KNAPSACK_ITEMS.map((it, i) => `${i + 1}: w${it.w} v${it.v}`)],
        corner: 'item \\ cap',
      }
    case 'lcs':
      return { cols: ['∅', ...LCS_B], rows: ['∅', ...LCS_A], corner: '' }
  }
}

export default function DPTable() {
  const [mode, setMode] = useState<DPMode>('knapsack')
  const frames = useMemo(() => (mode === 'fib' ? fibFrames(10) : mode === 'knapsack' ? knapsackFrames() : lcsFrames()), [mode])
  const p = useFrames(frames.length, mode)
  const f = frames[p.index]!
  const { cols, rows, corner } = headers(mode)
  const key = (r: number, c: number) => `${r},${c}`
  const deps = new Set(f.deps.map(([r, c]) => key(r, c)))
  const path = new Set(f.path.map(([r, c]) => key(r, c)))
  const snippet = dpSnippets[mode]

  return (
    <WidgetFrame title="DP table filler">
      <div className="mode-tabs" role="group" aria-label="Problem">
        {(Object.keys(modeLabel) as DPMode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{modeLabel[m]}</button>
        ))}
      </div>
      <p className="small muted">
        {mode === 'fib' && 'dp[i] = dp[i − 1] + dp[i − 2]. Each cell reads the two before it.'}
        {mode === 'knapsack' && `Items (weight, value), capacity ${KNAPSACK_CAPACITY}. dp[i][c] = best value using the first i items within capacity c.`}
        {mode === 'lcs' && `Longest common subsequence of "${LCS_A}" and "${LCS_B}". dp[i][j] = LCS length of the first i and first j letters.`}
      </p>

      <div className="table-wrap dp-wrap" role="region" aria-label="DP table" tabIndex={0}>
        <table className={`dp-table dp-${mode}`}>
          <thead>
            <tr>
              <th scope="col" className="dp-corner">{corner}</th>
              {cols.map((c, j) => <th key={j} scope="col">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {f.table.map((row, r) => (
              <tr key={r}>
                <th scope="row">{rows[r]}</th>
                {row.map((v, c) => {
                  const k = key(r, c)
                  const isCell = f.cell?.[0] === r && f.cell?.[1] === c
                  const cls = isCell ? 'is-current' : path.has(k) ? 'is-path' : deps.has(k) ? 'is-dep' : v === null ? 'is-empty' : ''
                  return <td key={c} className={cls}>{v ?? ''}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small legend-row" aria-hidden="true">
        <span className="legend-item"><span className="legend-swatch is-current" />this cell</span>
        <span className="legend-item"><span className="legend-swatch is-dep" />cells it reads</span>
        {mode !== 'fib' && <span className="legend-item"><span className="legend-swatch is-path" />traceback</span>}
      </p>

      <StepControls
        onReset={() => { p.setPlaying(false); p.setIndex(0) }}
        onBack={() => p.setIndex(Math.max(0, p.index - 1))}
        onForward={() => p.setIndex(Math.min(frames.length - 1, p.index + 1))}
        canBack={p.index > 0}
        canForward={p.index < frames.length - 1}
        playing={p.playing}
        onTogglePlay={() => p.setPlaying(!p.playing)}
        speed={p.speed}
        onSpeed={p.setSpeed}
        position={`Step ${p.index + 1} of ${frames.length}`}
      />
      <p className="widget-caption" aria-live="polite">{f.say}</p>
      <CodeBlock snippet={snippet.snippet} highlight={{ ts: snippet.lines.ts[f.line], py: snippet.lines.py[f.line] }} />
    </WidgetFrame>
  )
}
