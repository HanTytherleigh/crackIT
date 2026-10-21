import { useId, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, usePlayer, WidgetFrame } from './controls'

type SeriesId = '1' | 'log n' | 'n' | 'n log n' | 'n^2'

const series: { id: SeriesId; label: string; f: (n: number) => number; dash: string; example: string }[] = [
  { id: '1', label: 'O(1)', f: () => 1, dash: '2 5', example: 'Read one array item' },
  { id: 'log n', label: 'O(log n)', f: (n) => (n <= 1 ? 0 : Math.log2(n)), dash: '10 4 2 4', example: 'Binary search' },
  { id: 'n', label: 'O(n)', f: (n) => n, dash: '', example: 'Look at every item once' },
  { id: 'n log n', label: 'O(n log n)', f: (n) => (n <= 1 ? 0 : n * Math.log2(n)), dash: '8 4', example: 'Merge sort' },
  { id: 'n^2', label: 'O(n²)', f: (n) => n * n, dash: '3 3', example: 'Compare every pair' },
]

const snippets: Record<SeriesId, { ts: string; py: string }> = {
  '1': { ts: 'const x = arr[i]  // one step', py: 'x = arr[i]  # one step' },
  'log n': {
    ts: 'while (lo <= hi) {\n  const mid = Math.floor((lo + hi) / 2)\n  // throw away half each time\n}',
    py: 'while lo <= hi:\n    mid = (lo + hi) // 2\n    # throw away half each time',
  },
  n: { ts: 'for (const x of arr) {\n  check(x)\n}', py: 'for x in arr:\n    check(x)' },
  'n log n': {
    ts: '// split in half (log n levels),\n// merge n items at each level\nmergeSort(arr)',
    py: '# split in half (log n levels),\n# merge n items at each level\nmerge_sort(arr)',
  },
  'n^2': {
    ts: 'for (const a of arr) {\n  for (const b of arr) {\n    compare(a, b)\n  }\n}',
    py: 'for a in arr:\n    for b in arr:\n        compare(a, b)',
  },
}

const N_MIN = 1
const N_MAX = 1024
const N_START = 8

const fmt = (v: number) =>
  v >= 100 ? Math.round(v).toLocaleString('en-GB') : v.toLocaleString('en-GB', { maximumFractionDigits: 1 })

// Chart geometry (SVG user units).
const W = 340
const H = 210
const PAD = { l: 8, r: 8, t: 10, b: 22 }

export default function GrowthPlotter() {
  const [n, setN] = useState(N_START)
  const [focus, setFocus] = useState<SeriesId>('n')
  const sliderId = useId()
  const { playing, setPlaying, speed, setSpeed } = usePlayer(() => {
    let more = false
    setN((cur) => {
      const next = Math.min(N_MAX, cur * 2)
      more = next * 2 <= N_MAX
      return next
    })
    return more
  })

  // Show the range up to 2n so the effect of doubling is visible on the chart.
  const xMax = Math.max(4, n * 2)
  const yMax = Math.max(...series.map((s) => s.f(xMax))) * 1.05
  const x = (v: number) => PAD.l + (v / xMax) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b)
  const path = (f: (v: number) => number) => {
    const pts: string[] = []
    for (let i = 0; i <= 80; i++) {
      const v = Math.max(1, (i / 80) * xMax)
      pts.push(`${x(v).toFixed(1)},${y(f(v)).toFixed(1)}`)
    }
    return `M${pts.join('L')}`
  }

  const focused = series.find((s) => s.id === focus)!
  const ratio = (s: (typeof series)[number]) => (s.f(n) === 0 ? '—' : `×${fmt(s.f(2 * n) / s.f(n))}`)

  return (
    <WidgetFrame
      title="Big O growth plotter"
      caption={`n = ${fmt(n)}. Doubling to ${fmt(2 * n)} makes ${focused.label} work go from ${fmt(focused.f(n))} to ${fmt(focused.f(2 * n))} steps (${ratio(focused)}).`}
    >
      <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Growth curves from n = 1 to ${fmt(xMax)}. ${focused.label} is highlighted.`}>
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} className="axis" />
        <line x1={x(n)} y1={PAD.t} x2={x(n)} y2={H - PAD.b} className="marker" />
        <text x={x(n)} y={H - 6} className="tick" textAnchor="middle">n = {fmt(n)}</text>
        <text x={W - PAD.r} y={H - 6} className="tick" textAnchor="end">{fmt(xMax)}</text>
        {series.map((s, i) => (
          <path
            key={s.id}
            d={path(s.f)}
            className={`curve s${i + 1}${s.id === focus ? ' is-focus' : ''}`}
            strokeDasharray={s.dash || undefined}
          />
        ))}
        <circle cx={x(n)} cy={y(focused.f(n))} r={5} className={`dot s${series.indexOf(focused) + 1}`} />
      </svg>

      <div className="plot-controls">
        <label htmlFor={sliderId} className="small">Input size n: <strong>{fmt(n)}</strong></label>
        {/* Each notch is a doubling, so the slider moves through 1, 2, 4, … 1,024. */}
        <input
          id={sliderId}
          type="range"
          className="range"
          min={0}
          max={Math.log2(N_MAX)}
          step={1}
          value={Math.round(Math.log2(n))}
          aria-valuetext={`n = ${fmt(n)}`}
          onChange={(e) => {
            setPlaying(false)
            setN(2 ** Number(e.target.value))
          }}
        />
        <button type="button" className="btn btn-primary" disabled={n * 2 > N_MAX} onClick={() => setN(n * 2)}>
          Double the input
        </button>
      </div>

      <StepControls
        onReset={() => {
          setPlaying(false)
          setN(N_START)
        }}
        onBack={() => setN(Math.max(N_MIN, Math.floor(n / 2)))}
        onForward={() => setN(Math.min(N_MAX, n * 2))}
        canBack={n > N_MIN}
        canForward={n * 2 <= N_MAX}
        backLabel="Halve n"
        forwardLabel="Double n"
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
        speed={speed}
        onSpeed={setSpeed}
      />

      <div className="table-wrap" role="region" aria-label="Steps at n and 2n" tabIndex={0}>
        <table className="growth-table">
          <thead>
            <tr>
              <th scope="col">Growth</th>
              <th scope="col">n = {fmt(n)}</th>
              <th scope="col">2n = {fmt(2 * n)}</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s, i) => (
              <tr key={s.id} className={s.id === focus ? 'is-focus' : undefined}>
                <th scope="row">
                  <button type="button" className="series-btn" aria-pressed={s.id === focus} onClick={() => setFocus(s.id)}>
                    <svg width="22" height="8" aria-hidden="true">
                      <line x1="1" y1="4" x2="21" y2="4" className={`curve s${i + 1} is-focus`} strokeDasharray={s.dash || undefined} />
                    </svg>
                    {s.label}
                  </button>
                </th>
                <td>{fmt(s.f(n))}</td>
                <td>{fmt(s.f(2 * n))}</td>
                <td>{ratio(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="small muted">{focused.label}: {focused.example.toLowerCase()}. Tap a row to see its code.</p>
      <CodeBlock snippet={snippets[focus]} />
    </WidgetFrame>
  )
}
