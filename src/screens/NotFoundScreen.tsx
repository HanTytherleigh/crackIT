import { Link } from 'react-router-dom'

export function NotFoundScreen() {
  return (
    <div className="page">
      <h1>Nothing here</h1>
      <p className="page-lead">That page does not exist, or that module is still locked.</p>
      <Link to="/" className="btn">Back home</Link>
    </div>
  )
}
