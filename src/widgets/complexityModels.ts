// Loop "models" for the complexity reader. Each one mirrors a snippet's control flow and
// yields an event per line it visits, so step counts are computed, never hand-typed.

export type TraceEvent = { line: string; vars: Record<string, number>; count: number }
type ModelEvent = { line: string; vars: Record<string, number>; counted?: boolean }
type Gen = Generator<ModelEvent, void, unknown>
type Model = {
  /** Line keys this model emits; each drill item maps them to real line numbers. */
  lines: string[]
  run: (n: number, params: { k?: number }) => Gen
}

export const complexityModels = {
  single: {
    lines: ['loop', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'loop', vars: { i } }
        yield { line: 'step', vars: { i }, counted: true }
      }
    },
  },
  sequential: {
    lines: ['loop', 'step', 'loop2', 'step2'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'loop', vars: { i } }
        yield { line: 'step', vars: { i }, counted: true }
      }
      for (let j = 0; j < n; j++) {
        yield { line: 'loop2', vars: { j } }
        yield { line: 'step2', vars: { j }, counted: true }
      }
    },
  },
  nested: {
    lines: ['outer', 'inner', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = 0; j < n; j++) {
          yield { line: 'inner', vars: { i, j } }
          yield { line: 'step', vars: { i, j }, counted: true }
        }
      }
    },
  },
  triangular: {
    lines: ['outer', 'inner', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = 0; j < i; j++) {
          yield { line: 'inner', vars: { i, j } }
          yield { line: 'step', vars: { i, j }, counted: true }
        }
      }
    },
  },
  'unique-pairs': {
    lines: ['outer', 'inner', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = i + 1; j < n; j++) {
          yield { line: 'inner', vars: { i, j } }
          yield { line: 'step', vars: { i, j }, counted: true }
        }
      }
    },
  },
  'fixed-inner': {
    lines: ['outer', 'inner', 'step'],
    *run(n, { k = 5 }): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = 0; j < k; j++) {
          yield { line: 'inner', vars: { i, j } }
          yield { line: 'step', vars: { i, j }, counted: true }
        }
      }
    },
  },
  halving: {
    lines: ['init', 'loop', 'step'],
    *run(n): Gen {
      let i = n
      yield { line: 'init', vars: { i } }
      while (i > 1) {
        yield { line: 'loop', vars: { i } }
        i = Math.floor(i / 2)
        yield { line: 'step', vars: { i }, counted: true }
      }
    },
  },
  'loop-then-nested': {
    lines: ['loop', 'step', 'outer', 'inner', 'step2'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'loop', vars: { i } }
        yield { line: 'step', vars: { i }, counted: true }
      }
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = 0; j < n; j++) {
          yield { line: 'inner', vars: { i, j } }
          yield { line: 'step2', vars: { i, j }, counted: true }
        }
      }
    },
  },
  triple: {
    lines: ['outer', 'middle', 'inner', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        for (let j = 0; j < n; j++) {
          yield { line: 'middle', vars: { i, j } }
          for (let k = 0; k < n; k++) {
            yield { line: 'inner', vars: { i, j, k } }
            yield { line: 'step', vars: { i, j, k }, counted: true }
          }
        }
      }
    },
  },
  'n-log-n': {
    lines: ['outer', 'init', 'loop', 'step'],
    *run(n): Gen {
      for (let i = 0; i < n; i++) {
        yield { line: 'outer', vars: { i } }
        let j = n
        yield { line: 'init', vars: { i, j } }
        while (j > 1) {
          yield { line: 'loop', vars: { i, j } }
          j = Math.floor(j / 2)
          yield { line: 'step', vars: { i, j }, counted: true }
        }
      }
    },
  },
} satisfies Record<string, Model>

export type ComplexityModelId = keyof typeof complexityModels
export const complexityModelIds = Object.keys(complexityModels) as [ComplexityModelId, ...ComplexityModelId[]]

/** Every event for one run, with a running count of the counted steps. */
export function trace(model: ComplexityModelId, n: number, params: { k?: number } = {}): TraceEvent[] {
  const out: TraceEvent[] = []
  let count = 0
  for (const e of complexityModels[model].run(n, params)) {
    if (e.counted) count++
    out.push({ line: e.line, vars: e.vars, count })
  }
  return out
}

export function countSteps(model: ComplexityModelId, n: number, params: { k?: number } = {}): number {
  let count = 0
  for (const e of complexityModels[model].run(n, params)) if (e.counted) count++
  return count
}
