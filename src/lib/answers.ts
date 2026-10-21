import type { Check } from '../content/schema'

/**
 * Normalises a typed answer so that equivalent spellings compare equal:
 * "O(n²)", "o(n^2)", "n**2", "O(n * n)" and "n^2" all become "n^2".
 */
export function normalizeAnswer(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\*\*/g, '^')
    .replace(/[×·]/g, '*')
    .replace(/\s+/g, '')
  // Strip a wrapping "o(...)" or "big o(...)", including "bigo".
  const wrapped = s.match(/^(?:big)?o\((.*)\)$/)
  if (wrapped) s = wrapped[1]!
  return s
    .replace(/log_?2/g, 'log')
    .replace(/\blg/g, 'log')
    .replace(/log\(([a-z])\)/g, 'log$1')
    .replace(/([a-z])\*\1\*\1/g, '$1^3')
    .replace(/([a-z])\*\1/g, '$1^2')
}

export function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,\s_]/g, '')
  if (!/^-?(\d+(\.\d+)?|\.\d+)$/.test(cleaned)) return undefined
  return Number(cleaned)
}

/** Returns whether a typed (or chosen) answer is correct for the check. */
export function isCorrect(check: Check, answer: string): boolean {
  switch (check.kind) {
    case 'choice':
      return answer === String(check.answer)
    case 'text': {
      const given = normalizeAnswer(answer)
      return given.length > 0 && check.accept.some((a) => normalizeAnswer(a) === given)
    }
    case 'number': {
      const n = parseNumber(answer)
      return n !== undefined && Math.abs(n - check.answer) <= check.tolerance
    }
  }
}

export function displayAnswer(check: Check): string {
  switch (check.kind) {
    case 'choice':
      return check.options[check.answer]!
    case 'text':
      return check.accept[0]!
    case 'number':
      // Only call it approximate when the tolerance is a whole step or more, e.g. "about 20 guesses".
      return check.tolerance >= 1 ? `About ${check.answer.toLocaleString('en-GB')}` : check.answer.toLocaleString('en-GB')
  }
}
