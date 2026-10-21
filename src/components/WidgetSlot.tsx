import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
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

// Each widget is its own chunk, loaded when a lesson first shows it.
const widgets: Partial<Record<WidgetId, LazyExoticComponent<ComponentType>>> = {
  'growth-plotter': lazy(() => import('../widgets/GrowthPlotter')),
  'binary-search-stepper': lazy(() => import('../widgets/BinarySearchStepper')),
  'complexity-reader': lazy(() => import('../widgets/ComplexityReader')),
  'array-ops': lazy(() => import('../widgets/ArrayOps')),
  'two-pointers': lazy(() => import('../widgets/TwoPointers')),
  'hash-table': lazy(() => import('../widgets/HashTable')),
  'linked-list': lazy(() => import('../widgets/LinkedList')),
  'stack-queue': lazy(() => import('../widgets/StackQueue')),
  'call-stack': lazy(() => import('../widgets/CallStack')),
  'tree-traversal': lazy(() => import('../widgets/TreeTraversal')),
}

/** Embeds an interactive widget by id, or a placeholder while that widget is still being built. */
export function WidgetSlot({ id }: { id: WidgetId }) {
  const Widget = widgets[id]
  if (!Widget)
    return (
      <div className="widget-slot" role="note">
        <span className="badge">Interactive</span>
        <p><strong>{widgetTitles[id]}</strong></p>
        <p className="muted small">This widget is being built and will appear here.</p>
      </div>
    )
  return (
    <Suspense fallback={<div className="widget-slot"><p className="muted small" role="status">Loading {widgetTitles[id].toLowerCase()}…</p></div>}>
      <Widget />
    </Suspense>
  )
}
