import { Link } from 'react-router-dom'

export function ReviewScreen() {
  return (
    <div className="page">
      <h1>Review</h1>
      <p className="page-lead">Short spaced-repetition sessions, so what you learn stays learned.</p>
      <div className="card empty">
        <p>Nothing to review yet.</p>
        <p>Answer the checks in a lesson and they will come back here when they are due.</p>
        <Link to="/learn" className="btn">Go to lessons</Link>
      </div>
    </div>
  )
}
