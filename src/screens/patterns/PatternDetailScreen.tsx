import { Link, useParams } from 'react-router-dom'
import { patternName, usePatterns } from '../../content/patterns'
import { modules } from '../../content/modules'
import { BackIcon } from '../../components/Icons'
import { CodeBlock } from '../../components/CodeBlock'
import { Prose } from '../../components/Prose'
import { NotFoundScreen } from '../NotFoundScreen'

export function PatternDetailScreen() {
  const { patternId } = useParams()
  const patterns = usePatterns()
  if (!patterns) return <div className="page"><p className="muted" role="status">Loading…</p></div>
  const p = patterns.find((x) => x.id === patternId)
  if (!p) return <NotFoundScreen />
  const module = modules.find((m) => m.topics.some((t) => t.id === p.topic))
  const topic = module?.topics.find((t) => t.id === p.topic)

  return (
    <div className="page">
      <Link to="/patterns" className="back-link"><BackIcon /> Patterns</Link>
      <h1>{p.name}</h1>
      <Prose text={p.cue} className="page-lead" />

      <section className="card stack" aria-labelledby="signals-h">
        <h2 id="signals-h">Signals in the problem statement</h2>
        <ul className="signal-chips">
          {p.signals.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p><strong>Typical cost:</strong> {p.complexity}</p>
      </section>

      <section className="section-gap" aria-labelledby="template-h">
        <h2 id="template-h">Template</h2>
        <CodeBlock snippet={p.template} />
      </section>

      <section className="section-gap" aria-labelledby="examples-h">
        <h2 id="examples-h">Example problems</h2>
        <ul className="example-list">
          {p.examples.map((e) => (
            <li key={e.title} className="card">
              <h3>{e.title}</h3>
              <Prose text={e.statement} />
              <Prose text={`**Why this pattern:** ${e.why}`} className="muted" />
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack section-gap" aria-labelledby="confusions-h">
        <h2 id="confusions-h">Don't confuse it with</h2>
        <ul className="mistakes">
          {p.confusions.map((c) => (
            <li key={c.with}>
              <p className="mistake-title"><Link to={`/patterns/${c.with}`}>{patternName(patterns, c.with)}</Link></p>
              <Prose text={c.difference} className="fix" />
            </li>
          ))}
        </ul>
      </section>

      {module && topic && (
        <p className="section-gap">
          <Link to={`/learn/${module!.id}/${topic.id}`} className="btn">Revise the lesson: {topic.title}</Link>
        </p>
      )}
    </div>
  )
}
