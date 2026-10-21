import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { modulesFileSchema } from '../src/content/schema'

const modulesJson = JSON.parse(readFileSync('content/modules.json', 'utf8'))

describe('modules.json', () => {
  it('matches the schema', () => {
    expect(modulesFileSchema.safeParse(modulesJson).success).toBe(true)
  })

  it('has DSA as the only available module, with ten topics', () => {
    const available = modulesJson.modules.filter((m: { status: string }) => m.status === 'available')
    expect(available.map((m: { id: string }) => m.id)).toEqual(['dsa'])
    expect(available[0].topics).toHaveLength(10)
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
