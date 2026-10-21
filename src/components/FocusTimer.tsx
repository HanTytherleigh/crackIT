import { useEffect, useState } from 'react'
import { useSettings } from '../state/settings'

/** An optional, quiet countdown. It never interrupts; it just suggests a break at zero. */
export function FocusTimer() {
  const minutes = useSettings((s) => s.focusTimerMinutes)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => setRemaining(minutes * 60), [minutes])
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running])
  useEffect(() => {
    if (remaining === 0) setRunning(false)
  }, [remaining])

  if (minutes === 0) return null
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const done = remaining === 0

  return (
    <div className="focus-timer">
      <button
        type="button"
        className="timer-btn"
        onClick={() => (done ? (setRemaining(minutes * 60), setRunning(true)) : setRunning(!running))}
        aria-label={done ? 'Restart focus timer' : running ? `Pause focus timer, ${mm} minutes ${ss} seconds left` : `Start ${minutes} minute focus timer`}
      >
        <span aria-hidden="true">{done ? 'Restart' : `${mm}:${ss}`}</span>
        {!done && <span aria-hidden="true" className="timer-state">{running ? '❙❙' : '▶'}</span>}
      </button>
      <span role="status" className="visually-hidden">{done ? 'Focus time is up. A short break helps it stick.' : ''}</span>
    </div>
  )
}
