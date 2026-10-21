import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type SnippetLanguage = 'ts' | 'py'

interface SettingsState {
  theme: ThemeChoice
  reducedMotion: boolean
  focusTimerMinutes: number
  snippetLanguage: SnippetLanguage
  setTheme: (theme: ThemeChoice) => void
  setReducedMotion: (on: boolean) => void
  setFocusTimerMinutes: (minutes: number) => void
  setSnippetLanguage: (lang: SnippetLanguage) => void
  reset: () => void
}

const defaults = {
  theme: 'system' as ThemeChoice,
  reducedMotion: false,
  focusTimerMinutes: 20,
  snippetLanguage: 'ts' as SnippetLanguage,
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setFocusTimerMinutes: (focusTimerMinutes) => set({ focusTimerMinutes }),
      setSnippetLanguage: (snippetLanguage) => set({ snippetLanguage }),
      reset: () => set(defaults),
    }),
    { name: 'crackit.settings', version: 1 },
  ),
)

/** Mirrors the settings onto <html> so the CSS tokens pick them up. */
export function applySettingsToDocument(state: Pick<SettingsState, 'theme' | 'reducedMotion'>) {
  const root = document.documentElement
  if (state.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = state.theme
  if (state.reducedMotion) root.dataset.reducedMotion = 'true'
  else delete root.dataset.reducedMotion
}
