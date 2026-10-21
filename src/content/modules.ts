import raw from '../../content/modules.json'
import type { Module, ModulesFile } from './schema'

// modules.json is small and needed on every screen, so it ships in the main bundle.
// It is validated against the Zod schema at build time, so the runtime skips re-parsing
// and Zod stays out of the main bundle. Topic files load lazily per module (phase 2).
export const modules: Module[] = (raw as ModulesFile).modules

export function getModule(id: string | undefined): Module | undefined {
  return modules.find((m) => m.id === id)
}
