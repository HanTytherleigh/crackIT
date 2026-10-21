import { Link } from 'react-router-dom'
import { ProgressMap } from '../components/ProgressMap'
import { modules } from '../content/modules'

export function HomeScreen() {
  const dsa = modules.find((m) => m.status === 'available')!
  const first = dsa.topics[0]!

  return (
    <div className="page">
      <h1>Good to see you</h1>
      <p className="page-lead">A short session is plenty. Recall first, then explain, then practise.</p>

      <section className="card stack" aria-labelledby="review-heading">
        <h2 id="review-heading">Today's review</h2>
        <p className="muted">Nothing is due yet. Questions you answer in lessons come back here on a schedule, just before you would forget them.</p>
        <Link to="/review" className="btn">Open review</Link>
      </section>

      <section className="card stack section-gap" aria-labelledby="continue-heading">
        <h2 id="continue-heading">Start where it begins</h2>
        <p>
          <strong>{first.title}</strong>
          <span className="muted"> · {first.summary}</span>
        </p>
        <Link to={`/learn/${dsa.id}/${first.id}`} className="btn btn-primary">Start lesson</Link>
      </section>

      <section className="section-gap" aria-labelledby="map-heading">
        <h2 id="map-heading">Your map</h2>
        <p className="muted">{dsa.title}</p>
        <ProgressMap module={dsa} />
      </section>
    </div>
  )
}
