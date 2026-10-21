import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type SnippetLanguage = 'ts' | 'py'

export interface SettingsData {
  theme: ThemeChoice
  reducedMotion: boolean
  focusTimerMinutes: number
  snippetLanguage: SnippetLanguage
}

interface SettingsState extends SettingsData {
  setTheme: (theme: ThemeChoice) => void
  setReducedMotion: (on: boolean) => void
  setFocusTimerMinutes: (minutes: number) => void
  setSnippetLanguage: (lang: SnippetLanguage) => void
  replace: (data: SettingsData) => void
  reset: () => void
}

const defaults: SettingsData = {
  theme: 'system',
  reducedMotion: false,
  focusTimerMinutes: 20,
  snippetLanguage: 'ts',
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setFocusTimerMinutes: (focusTimerMinutes) => set({ focusTimerMinutes }),
      setSnippetLanguage: (snippetLanguage) => set({ snippetLanguage }),
      replace: (data) => set({ ...defaults, ...data }),
      reset: () => set(defaults),
    }),
    { name: 'crackit.settings', version: 1 },
  ),
)

export function settingsData(s: SettingsData): SettingsData {
  return {
    theme: s.theme,
    reducedMotion: s.reducedMotion,
    focusTimerMinutes: s.focusTimerMinutes,
    snippetLanguage: s.snippetLanguage,
  }
}

/** Mirrors the settings onto <html> so the CSS tokens pick them up. */
export function applySettingsToDocument(state: Pick<SettingsData, 'theme' | 'reducedMotion'>) {
  const root = document.documentElement
  if (state.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = state.theme
  if (state.reducedMotion) root.dataset.reducedMotion = 'true'
  else delete root.dataset.reducedMotion
}

/** True when animations should step instantly, from the system or the in-app setting. */
export function useReducedMotion(): boolean {
  const setting = useSettings((s) => s.reducedMotion)
  const system = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return setting || !!system
}
