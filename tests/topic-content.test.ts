import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { topicSchema } from '../src/content/schema'
import { parseBlocks } from '../src/components/Prose'

const bigO = JSON.parse(readFileSync('content/dsa/01-big-o.json', 'utf8'))

describe('every topic file', () => {
  for (const f of readdirSync('content/dsa')) {
    it(`${f} matches the topic schema`, () => {
      const r = topicSchema.safeParse(JSON.parse(readFileSync(`content/dsa/${f}`, 'utf8')))
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
    })
  }
})

describe('Big O topic', () => {
  it('matches the topic schema', () => {
    const r = topicSchema.safeParse(bigO)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('has the triangular trace values from the brief', () => {
    const tri = (n: number) => (n * (n - 1)) / 2
    expect([4, 8, 16].map(tri)).toEqual([6, 28, 120])
    const text = JSON.stringify(bigO)
    for (const v of ['| 4 | 6 |', '| 8 | 28 |', '| 16 | 120 |']) expect(text).toContain(v)
  })
})

describe('topicSchema rejects bad content', () => {
  const clone = () => JSON.parse(JSON.stringify(bigO))

  it('a choice answer out of range', () => {
    const t = clone()
    const c = t.checks.find((x: { kind: string }) => x.kind === 'choice')
    c.answer = 9
    expect(topicSchema.safeParse(t).success).toBe(false)
  })
  it('hints that skip back down the ladder', () => {
    const t = clone()
    t.checks[0].hints = [{ level: 'approach', text: 'a' }, { level: 'nudge', text: 'b' }]
    expect(topicSchema.safeParse(t).success).toBe(false)
  })
  it('a widget listed but never embedded', () => {
    const t = clone()
    t.widgets.push('heap')
    expect(topicSchema.safeParse(t).success).toBe(false)
  })
  it('an unknown widget id', () => {
    const t = clone()
    t.mentalModel.sections[0].widget = 'spinner'
    expect(topicSchema.safeParse(t).success).toBe(false)
  })
  it('duplicate check ids', () => {
    const t = clone()
    t.checks[1].id = t.checks[0].id
    expect(topicSchema.safeParse(t).success).toBe(false)
  })
})

describe('Prose parser', () => {
  it('splits paragraphs, lists, tables and code fences', () => {
    const blocks = parseBlocks('Para one\ncontinues.\n\n- a\n- b\n\n| h1 | h2 |\n|---|---|\n| 1 | 2 |\n\n```\nx = 1\n\ny = 2\n```')
    expect(blocks.map((b) => b.type)).toEqual(['p', 'ul', 'table', 'code'])
    expect(blocks[0]).toEqual({ type: 'p', text: 'Para one continues.' })
    expect(blocks[2]).toEqual({ type: 'table', head: ['h1', 'h2'], rows: [['1', '2']] })
    expect(blocks[3]).toEqual({ type: 'code', text: 'x = 1\n\ny = 2' })
  })
})
