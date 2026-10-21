const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/** "today", "tomorrow", or a weekday and date, for when the next review is due. */
export function describeDay(date: Date, now = new Date()): string {
  const days = Math.round((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return dayFmt.format(date)
}
