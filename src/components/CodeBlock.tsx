import type { Snippet } from '../content/schema'
import { useSettings, type SnippetLanguage } from '../state/settings'

const labels: Record<SnippetLanguage, string> = { ts: 'TypeScript', py: 'Python' }

/**
 * Shows a snippet in TypeScript or Python. The choice is global (Settings), so switching
 * here switches every code view. Widgets pass `highlight` to mark the active line.
 */
export function CodeBlock({ snippet, highlight, label }: {
  snippet: Snippet
  highlight?: Partial<Record<SnippetLanguage, number[]>>
  label?: string
}) {
  const lang = useSettings((s) => s.snippetLanguage)
  const setLang = useSettings((s) => s.setSnippetLanguage)
  const active = new Set(highlight?.[lang] ?? [])
  const lines = snippet[lang].split('\n')

  return (
    <figure className="code-block">
      <div className="code-tabs" role="group" aria-label="Code language">
        {(Object.keys(labels) as SnippetLanguage[]).map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
            {labels[l]}
          </button>
        ))}
        {label && <figcaption className="code-label">{label}</figcaption>}
      </div>
      <pre tabIndex={0} aria-label={`${labels[lang]} code`}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className={`code-line${active.has(i + 1) ? ' is-active' : ''}`} aria-current={active.has(i + 1) ? 'step' : undefined}>
              {line || ' '}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
