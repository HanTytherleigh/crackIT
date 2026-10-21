import type { Snippet } from '../content/schema'

export type MarkedSnippet<K extends string> = { snippet: Snippet; lines: Record<'ts' | 'py', Partial<Record<K, number[]>>> }

/**
 * Builds a snippet from code with trailing `@@key` markers, so each widget step can name the
 * line it highlights instead of hard-coding line numbers that drift when the code changes.
 */
export function marked<K extends string>(src: { ts: string; py: string }): MarkedSnippet<K> {
  const lines = { ts: {}, py: {} } as MarkedSnippet<K>['lines']
  const strip = (lang: 'ts' | 'py') =>
    src[lang]
      .replace(/^\n+|\n+$/g, '')
      .split('\n')
      .map((line, i) => {
        for (const m of line.matchAll(/\s*@@([a-z0-9-]+)/g)) {
          const key = m[1] as K
          ;(lines[lang][key] ??= []).push(i + 1)
        }
        return line.replace(/\s*@@[a-z0-9-]+/g, '').trimEnd()
      })
      .join('\n')
  return { snippet: { ts: strip('ts'), py: strip('py') }, lines }
}
