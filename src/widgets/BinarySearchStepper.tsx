import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { binarySearchFrames, bsLines, bsSnippet, maxGuesses } from './binarySearch'
import { StepControls, useFrames, usePlayer, WidgetFrame } from './controls'

const SORTED = [2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 72, 78, 84, 91, 95, 99]
// A fixed shuffle so the "unsorted" demo is the same every time.
const UNSORTED = [45, 91, 8, 67, 2, 99, 23, 56, 16, 84, 5, 72, 38, 95, 12, 78]
const MISSING = [50, 70]

const fmt = (v: number) => v.toLocaleString('en-GB')

export default function BinarySearchStepper() {
  const [mode, setMode] = useState<'game' | 'array'>('game')
  return (
    <WidgetFrame title="Binary search stepper">
      <div className="mode-tabs" role="group" aria-label="Mode">
        <button type="button" aria-pressed={mode === 'game'} onClick={() => setMode('game')}>Guessing game</button>
        <button type="button" aria-pressed={mode === 'array'} onClick={() => setMode('array')}>Sorted array</button>
      </div>
      {mode === 'game' ? <GuessingGame /> : <ArraySearch />}
    </WidgetFrame>
  )
}

type Guess = { value: number; result: 'higher' | 'lower' | 'correct' }

function GuessingGame() {
  const [size, setSize] = useState(100)
  const [secret, setSecret] = useState(() => randomInt(size))
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [input, setInput] = useState('')
  const inputId = useId()

  // The range still possible after the guesses so far.
  const { lo, hi } = guesses.reduce(
    (r, g) => (g.result === 'higher' ? { ...r, lo: Math.max(r.lo, g.value + 1) } : g.result === 'lower' ? { ...r, hi: Math.min(r.hi, g.value - 1) } : r),
    { lo: 1, hi: size },
  )
  const solved = guesses.at(-1)?.result === 'correct'
  const middle = Math.floor((lo + hi) / 2)

  const guessesRef = useRef(guesses)
  guessesRef.current = guesses
  const makeGuess = (value: number) => {
    const result: Guess['result'] = value === secret ? 'correct' : value < secret ? 'higher' : 'lower'
    setGuesses((gs) => [...gs, { value, result }])
    return result
  }
  const { playing, setPlaying, speed, setSpeed } = usePlayer(() => {
    const gs = guessesRef.current
    if (gs.at(-1)?.result === 'correct') return false
    return makeGuess(middle) !== 'correct'
  })

  function restart(newSize = size) {
    setPlaying(false)
    setSize(newSize)
    setSecret(randomInt(newSize))
    setGuesses([])
    setInput('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = Number(input.replace(/[,\s]/g, ''))
    if (!Number.isInteger(v) || v < 1 || v > size || solved) return
    makeGuess(v)
    setInput('')
  }

  const last = guesses.at(-1)
  const caption = !last
    ? `I'm thinking of a number from 1 to ${fmt(size)}. Halving guarantees it in at most ${maxGuesses(size)} guesses.`
    : last.result === 'correct'
      ? `Got it: ${fmt(last.value)} in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}. The halving limit for 1 to ${fmt(size)} is ${maxGuesses(size)}.`
      : `${fmt(last.value)} is too ${last.result === 'higher' ? 'low' : 'high'}: go ${last.result}. ${fmt(hi - lo + 1)} ${hi === lo ? 'number' : 'numbers'} left.`

  return (
    <div className="stack">
      <label className="small inline-field">
        Range 1 to
        <select className="select" value={size} onChange={(e) => restart(Number(e.target.value))}>
          {[100, 1000, 1_000_000, 1_000_000_000].map((s) => (
            <option key={s} value={s}>{fmt(s)}</option>
          ))}
        </select>
      </label>

      <div className="range-bar" aria-hidden="true">
        <div className="range-left" style={{ left: `${((lo - 1) / size) * 100}%`, width: `${Math.max(0.6, ((hi - lo + 1) / size) * 100)}%` }} />
      </div>
      <p className="small range-labels">
        <span>Still possible: <strong>{fmt(lo)}</strong> to <strong>{fmt(hi)}</strong></span>
        <span>Guesses: <strong>{guesses.length}</strong> / {maxGuesses(size)}</span>
      </p>

      <form onSubmit={submit} className="guess-row">
        <label htmlFor={inputId} className="visually-hidden">Your guess</label>
        <input id={inputId} className="text-input" inputMode="numeric" autoComplete="off" placeholder="Your guess" value={input} disabled={solved} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={solved || input.trim() === ''}>Guess</button>
      </form>

      <StepControls
        onReset={() => restart()}
        onBack={() => {
          setPlaying(false)
          setGuesses((gs) => gs.slice(0, -1))
        }}
        onForward={() => makeGuess(middle)}
        canBack={guesses.length > 0}
        canForward={!solved}
        backLabel="Undo last guess"
        forwardLabel="Guess the middle for me"
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
        speed={speed}
        onSpeed={setSpeed}
      />
      <p className="widget-caption" aria-live="polite">{caption}</p>
      {guesses.length > 0 && (
        <ol className="guess-list small" aria-label="Your guesses">
          {guesses.map((g, i) => (
            <li key={i}>{fmt(g.value)}: {g.result === 'correct' ? 'correct' : g.result}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ArraySearch() {
  const [unsorted, setUnsorted] = useState(false)
  const [target, setTarget] = useState(67)
  const values = unsorted ? UNSORTED : SORTED
  const frames = useMemo(() => binarySearchFrames(values, target), [values, target])
  const { index, setIndex, playing, setPlaying, speed, setSpeed } = useFrames(frames.length, `${target}-${unsorted}`)
  const frame = frames[index]!
  const targetId = useId()
  const present = values.indexOf(target)
  const missedIt = frame.line === 'not-found' && present >= 0
  const lucky = unsorted && frame.line === 'found'

  return (
    <div className="stack">
      <div className="array-options">
        <label htmlFor={targetId} className="small inline-field">
          Find
          <select id={targetId} className="select" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {[...SORTED, ...MISSING].sort((a, b) => a - b).map((v) => (
              <option key={v} value={v}>{v}{MISSING.includes(v) ? ' (not in list)' : ''}</option>
            ))}
          </select>
        </label>
        <label className="toggle small">
          <input type="checkbox" checked={unsorted} onChange={(e) => setUnsorted(e.target.checked)} />
          <span>Shuffle the list</span>
        </label>
      </div>

      <ol className="cells" aria-label={`List of ${values.length} numbers`}>
        {values.map((v, i) => {
          const out = i < frame.lo || i > frame.hi
          const isMid = frame.mid === i
          const tags = [i === frame.lo && !frame.done && 'lo', isMid && 'mid', i === frame.hi && !frame.done && 'hi'].filter(Boolean)
          return (
            <li
              key={i}
              className={`cell${out && !(frame.foundAt === i) ? ' is-out' : ''}${isMid ? ' is-mid' : ''}${frame.foundAt === i ? ' is-found' : ''}`}
              aria-label={`Index ${i}, value ${v}${out ? ', thrown away' : ''}${tags.length ? `, ${tags.join(' and ')}` : ''}`}
            >
              <span className="cell-tag" aria-hidden="true">{tags.join(' ')}</span>
              <span className="cell-val" aria-hidden="true">{v}</span>
              <span className="cell-idx" aria-hidden="true">{i}</span>
            </li>
          )
        })}
      </ol>

      <StepControls
        onReset={() => {
          setPlaying(false)
          setIndex(0)
        }}
        onBack={() => setIndex(Math.max(0, index - 1))}
        onForward={() => setIndex(Math.min(frames.length - 1, index + 1))}
        canBack={index > 0}
        canForward={index < frames.length - 1}
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
        speed={speed}
        onSpeed={setSpeed}
        position={`Step ${index + 1} of ${frames.length}`}
      />
      <p className="widget-caption" aria-live="polite">
        {frame.say}
        {missedIt && ` But ${target} is right there at index ${present}. Without sorted order, "higher or lower" points the wrong way.`}
        {lucky && ' That was luck: it happened to sit on the search path. Try 67 or 23, and most other values are missed.'}
      </p>
      <CodeBlock snippet={bsSnippet} highlight={{ ts: bsLines.ts[frame.line], py: bsLines.py[frame.line] }} />
    </div>
  )
}

function randomInt(max: number) {
  return 1 + Math.floor(Math.random() * max)
}
