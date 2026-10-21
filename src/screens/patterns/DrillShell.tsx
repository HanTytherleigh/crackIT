import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'

/** Common frame for the pattern drills: title, position, and next/previous. */
export function DrillShell({ title, lead, index, count, onMove, children }: {
  title: string
  lead: string
  index: number
  count: number
  onMove: (to: number) => void
  children: ReactNode
}) {
  return (
    <div className="page">
      <Link to="/patterns" className="back-link"><BackIcon /> Patterns</Link>
      <h1>{title}</h1>
      <p className="page-lead">{lead}</p>
      <div className="review-progress">
        <span>{index + 1} of {count}</span>
        <div className="review-bar" aria-hidden="true"><div style={{ width: `${((index + 1) / count) * 100}%` }} /></div>
      </div>
      <div className="section-gap">{children}</div>
      <div className="lesson-nav">
        <button type="button" className="btn" disabled={index === 0} onClick={() => { onMove(index - 1); window.scrollTo(0, 0) }}>Previous</button>
        <button type="button" className="btn btn-primary" disabled={index >= count - 1} onClick={() => { onMove(index + 1); window.scrollTo(0, 0) }}>Next problem</button>
      </div>
    </div>
  )
}
