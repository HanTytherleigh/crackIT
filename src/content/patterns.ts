import { useEffect, useState } from 'react'
import type { Check, ComplexityPredictionDrill, LookalikeDrill, Pattern, PatternsFile, SignalDrill, SignalItem, ComplexityPredictionItem } from './schema'

// The catalogue and drills are validated at build time and loaded lazily, each as its own chunk.

export const loadPatterns = () => import('../../content/patterns.json').then((m) => (m.default as unknown as PatternsFile).patterns)
export const loadSignalDrill = () => import('../../content/drills/signal-spotting.json').then((m) => m.default as unknown as SignalDrill)
export const loadLookalikeDrill = () => import('../../content/drills/lookalikes.json').then((m) => m.default as unknown as LookalikeDrill)
export const loadComplexityDrill = () =>
  import('../../content/drills/complexity-prediction.json').then((m) => m.default as unknown as ComplexityPredictionDrill)

/** Loads something once on mount; undefined until it arrives. */
export function useLoaded<T>(load: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    let live = true
    load().then((v) => live && setValue(v))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return value
}

export const usePatterns = () => useLoaded(loadPatterns)

export function patternName(patterns: Pattern[], id: string): string {
  return patterns.find((p) => p.id === id)?.name ?? id
}

// Review cards ---------------------------------------------------------------
// Signal-spotting and complexity items join the spaced-repetition queue as multiple-choice checks.

export type DrillCardKind = 'signal-spotting' | 'complexity-prediction'

export function signalAsCheck(item: SignalItem, patterns: Pattern[]): Check {
  const cues = item.candidates.filter((c) => c.cue).map((c) => `"${c.phrase}"`)
  return {
    id: item.id,
    kind: 'choice',
    prompt: `${item.statement}\n\nWhich pattern fits best?`,
    options: item.options.map((id) => patternName(patterns, id)),
    answer: item.options.indexOf(item.pattern),
    explanation: `${item.explanation}\n\nCue words: ${cues.join(', ')}.`,
    hints: [{ level: 'nudge', text: 'Which words in the statement limit what approach could work?' }],
  }
}

export function complexityAsCheck(item: ComplexityPredictionItem): Check {
  return {
    id: item.id,
    kind: 'choice',
    prompt: `${item.approach}\n\nWhat is its time complexity?`,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
    hints: [{ level: 'nudge', text: 'Count the steps: what runs inside what, and how many times?' }],
  }
}
