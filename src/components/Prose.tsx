import { Fragment, type ReactNode } from 'react'

// Renders the small Markdown subset used in content files, without innerHTML:
// paragraphs, "- " lists, "|" tables, ``` code fences, **bold**, *emphasis* and `code`.

type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'code'; text: string }

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

export function parseBlocks(src: string): Block[] {
  const lines = src.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.trim() === '') {
      i++
    } else if (line.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i++]!)
      i++
      blocks.push({ type: 'code', text: body.join('\n') })
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i]!.startsWith('|')) rows.push(cells(lines[i++]!))
      const [head = [], , ...body] = rows
      blocks.push({ type: 'table', head, rows: body })
    } else if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i]!.startsWith('- ')) items.push(lines[i++]!.slice(2))
      blocks.push({ type: 'ul', items })
    } else {
      const text: string[] = []
      while (i < lines.length && lines[i]!.trim() !== '' && !/^(```|\||- )/.test(lines[i]!)) text.push(lines[i++]!)
      blocks.push({ type: 'p', text: text.join(' ') })
    }
  }
  return blocks
}

export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i): ReactNode => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>
        if (part.startsWith('**') && part.endsWith('**') && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`prose${className ? ` ${className}` : ''}`}>
      {parseBlocks(text).map((b, i) => {
        switch (b.type) {
          case 'p':
            return <p key={i}><Inline text={b.text} /></p>
          case 'ul':
            return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>
          case 'code':
            return <pre key={i} className="code-plain"><code>{b.text}</code></pre>
          case 'table':
            return (
              <div key={i} className="table-wrap" tabIndex={0} role="region" aria-label="Table">
                <table>
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j} scope="col"><Inline text={h} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k}><Inline text={c} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </div>
  )
}
