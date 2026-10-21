import { modules } from '../content/modules'

export function ProgressScreen() {
  const available = modules.filter((m) => m.status === 'available')
  return (
    <div className="page">
      <h1>Progress</h1>
      <p className="page-lead">A topic becomes solid after its checks, a delayed re-check, and your own explanation.</p>
      {available.map((m) => (
        <section key={m.id} className="card stack" aria-labelledby={`p-${m.id}`}>
          <h2 id={`p-${m.id}`}>{m.title}</h2>
          <ul className="mastery-list">
            {m.topics.map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
                <span className="badge">Not started</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="card stack section-gap" aria-labelledby="backup-heading">
        <h2 id="backup-heading">Back up your progress</h2>
        <p className="muted">Progress lives only on this device. Export and import arrive with the progress store.</p>
      </section>
    </div>
  )
}
