import { useEffect, useRef, useState } from 'react'

export const speeds = [0.5, 1, 2] as const
export type Speed = (typeof speeds)[number]
const BASE_MS = 900

/**
 * Calls `tick` on an interval while playing. `tick` returns false to stop.
 * Playing only steps the state; any motion is CSS and honours reduced motion.
 */
export function usePlayer(tick: () => boolean) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      if (!tickRef.current()) setPlaying(false)
    }, BASE_MS / speed)
    return () => window.clearInterval(id)
  }, [playing, speed])

  return { playing, setPlaying, speed, setSpeed }
}

/** Frame index state for widgets whose steps are precomputed. Resets when `resetKey` changes. */
export function useFrames(count: number, resetKey: unknown) {
  const [index, setIndex] = useState(0)
  const indexRef = useRef(index)
  indexRef.current = index
  const player = usePlayer(() => {
    const i = indexRef.current
    if (i + 1 >= count) return false
    setIndex(i + 1)
    return i + 2 < count
  })
  const { setPlaying } = player
  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [resetKey, setPlaying])
  return { index, setIndex, ...player }
}

export function StepControls({
  onReset,
  onBack,
  onForward,
  canBack,
  canForward,
  playing,
  onTogglePlay,
  speed,
  onSpeed,
  forwardLabel = 'Step forward',
  backLabel = 'Step back',
  position,
}: {
  onReset: () => void
  onBack: () => void
  onForward: () => void
  canBack: boolean
  canForward: boolean
  playing: boolean
  onTogglePlay: () => void
  speed: Speed
  onSpeed: (s: Speed) => void
  forwardLabel?: string
  backLabel?: string
  position?: string
}) {
  return (
    <div className="step-controls">
      <div className="step-buttons" role="group" aria-label="Playback">
        <button type="button" className="ctl" onClick={onReset} aria-label="Reset">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5" /></svg>
        </button>
        <button type="button" className="ctl" onClick={onBack} disabled={!canBack} aria-label={backLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" className="ctl ctl-play" onClick={onTogglePlay} disabled={!playing && !canForward} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
          )}
        </button>
        <button type="button" className="ctl" onClick={onForward} disabled={!canForward} aria-label={forwardLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <label className="speed">
        <span className="visually-hidden">Speed</span>
        <select value={speed} onChange={(e) => onSpeed(Number(e.target.value) as Speed)} className="select">
          {speeds.map((s) => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>
      </label>
      {position && <span className="step-pos">{position}</span>}
    </div>
  )
}

/** Shared frame for every widget: a title, the interactive area, and a polite live caption. */
export function WidgetFrame({ title, children, caption }: { title: string; children: React.ReactNode; caption?: string }) {
  return (
    <figure className="widget" aria-label={title}>
      <figcaption className="widget-title">{title}</figcaption>
      {children}
      {caption !== undefined && (
        <p className="widget-caption" aria-live="polite">{caption}</p>
      )}
    </figure>
  )
}
