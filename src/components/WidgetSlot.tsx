import type { WidgetId } from '../content/schema'

export const widgetTitles: Record<WidgetId, string> = {
  'growth-plotter': 'Big O growth plotter',
  'binary-search-stepper': 'Binary search stepper',
  'complexity-reader': 'Complexity reader',
  'array-ops': 'Array operations',
  'two-pointers': 'Two pointers and sliding window',
  'hash-table': 'Hash table',
  'linked-list': 'Linked list',
  'stack-queue': 'Stack and queue',
  'call-stack': 'Recursion call stack',
  'tree-traversal': 'Tree traversals',
  heap: 'Heap',
  graph: 'Graph',
  'dp-table': 'DP table filler',
}

/** Embeds an interactive widget by id. Widgets are built from phase 3 onwards. */
export function WidgetSlot({ id }: { id: WidgetId }) {
  return (
    <div className="widget-slot" role="note">
      <span className="badge">Interactive</span>
      <p><strong>{widgetTitles[id]}</strong></p>
      <p className="muted small">This widget is being built and will appear here.</p>
    </div>
  )
}
