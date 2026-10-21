import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { modulesFileSchema } from '../src/content/schema'

const modulesJson = JSON.parse(readFileSync('content/modules.json', 'utf8'))

describe('modules.json', () => {
  it('matches the schema', () => {
    expect(modulesFileSchema.safeParse(modulesJson).success).toBe(true)
  })

  it('has DSA available with ten written topics', () => {
    const dsa = modulesJson.modules.find((m: { id: string }) => m.id === 'dsa')
    expect(dsa.status).toBe('available')
    expect(dsa.topics).toHaveLength(10)
    expect(dsa.topics.every((t: { file?: string }) => t.file)).toBe(true)
  })

  it('lists eleven modules in the agreed order', () => {
    expect(modulesJson.modules.map((m: { id: string }) => m.id)).toEqual([
      'dsa', 'oop', 'databases', 'operating-systems', 'networking', 'software-engineering',
      'security', 'system-design', 'architecture', 'discrete-maths', 'behavioural',
    ])
  })
})

describe('modulesFileSchema', () => {
  const base = { schemaVersion: 1, modules: [{ id: 'x', title: 'X', description: 'd', status: 'available', topics: [] }] }

  it('rejects duplicate module ids', () => {
    const bad = { ...base, modules: [base.modules[0], base.modules[0]] }
    expect(modulesFileSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a locked module with topics', () => {
    const bad = {
      ...base,
      modules: [{ ...base.modules[0], status: 'locked', topics: [{ id: 't', title: 'T', summary: 's' }] }],
    }
    expect(modulesFileSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects ids that are not kebab-case', () => {
    const bad = { ...base, modules: [{ ...base.modules[0], id: 'Big O' }] }
    expect(modulesFileSchema.safeParse(bad).success).toBe(false)
  })
})
