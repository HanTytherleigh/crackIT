# crackIT

A personal study app for rebuilding computer science foundations from first principles, aimed at UK graduate interviews and assessment centres. It trains recall and reasoning rather than passive reading: every lesson starts by asking what you remember, makes you explain it back, and only reveals answers after you have tried.

Live: https://hantytherleigh.github.io/crackIT/ (open it in Safari on iPhone, then Share → Add to Home Screen. It works offline after the first load.)

It is a static, installable PWA. There are no accounts, no backend, no tracking and no network calls after loading. Progress lives in your browser and can be exported to a JSON file.

## What's inside

- **Data structures and algorithms**: ten lessons, from Big O to dynamic programming. Each has recall prompts, an explanation with an interactive widget, an explain-back checklist, ten checks, a hands-on task with a reference answer in TypeScript and Python, and common mistakes.
- **Fourteen interactive widgets**: growth plotter, binary search, complexity reader, array operations, two pointers and sliding window, hash table, linked list, stack and queue, recursion call stack, tree traversals, heap, graph builder and search, and DP tables. Each one steps forward and back, plays at three speeds, and highlights the matching line of code.
- **Pattern trainer**: a catalogue of 16 interview patterns, plus signal-spotting, look-alike and complexity-prediction drills.
- **Spaced repetition**: a Leitner scheduler. Lesson checks and drill items come back for review, mixed together, just before you would forget them.
- **Mastery that means something**: a topic is only "solid" after you pass its checks, pass your own explain-back, and pass a re-check a day or more later.
- Ten more modules (OOP, databases, operating systems, networking, software engineering, security, system design, architecture, discrete maths, behavioural prep) are mapped and locked, ready to be added one at a time.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/crackIT/
npm test           # Vitest (needs python3 for the reference-answer test)
npm run build      # validate content, typecheck, build, scan dist for secrets
npm run preview    # serve the production build, service worker included
npm run icons      # re-render the PNG icons from public/icons/icon.svg
```

Stack: Vite, React 19 and strict TypeScript, React Router in hash mode (so refreshes never 404 on GitHub Pages), Zustand for state, Zod for content and backup validation, and `vite-plugin-pwa` for offline use. Styling is plain CSS with design tokens in `src/styles/tokens.css`. Charts and widgets are hand-written SVG and HTML; there is no UI framework.

## Project structure

```
content/                 all lesson content, as JSON, validated at build time
  modules.json           the module map, including locked placeholders
  dsa/NN-topic.json      one file per lesson
  patterns.json          the pattern catalogue
  drills/                complexity reading, signal spotting, look-alikes, complexity prediction
src/
  content/               Zod schemas (schema.ts) and lazy loaders
  lesson/                the six-step lesson flow and the check card
  widgets/               each widget: pure step logic (*.ts) plus its component (*.tsx)
  screens/               Home, Learn, Lesson, Patterns and drills, Review, Progress, Settings
  state/                 settings and progress stores (localStorage)
  lib/                   scheduler, answer checking, progress model, migrations, backup
scripts/                 content validation, the secret scan, icon rendering
tests/                   Vitest suites
```

## Adding content

All content is JSON under `/content`, checked against the schemas in `src/content/schema.ts`. `npm run build` fails on invalid content, and also when:

- a topic file isn't referenced from the module map, or its id doesn't match;
- a prerequisite, pattern or widget id is unknown;
- a hint ladder isn't in order (nudge, then pattern, then approach);
- a highlighted line doesn't exist in its snippet;
- a tickable cue phrase doesn't appear in its problem statement.

**Add a topic**: write `content/<module>/NN-topic.json` (copy `content/dsa/01-big-o.json` as a template), then add `"file"` to its entry in `content/modules.json`. Also add a case to `tests/references.test.ts`, which runs every hands-on reference answer in both TypeScript and Python.

**Add a module**: change its entry in `modules.json` from `"locked"` to `"available"`, list its topics, and add the topic files. No code changes are needed unless the module needs a new widget. Widgets are registered by id in `src/components/WidgetSlot.tsx`.

Text fields accept a small Markdown subset: paragraphs, `- ` lists, `|` tables, code fences, `**bold**`, `*emphasis*` and `` `code` ``.

## Progress, review and backups

Progress is stored in `localStorage` under `crackit.progress`. It is versioned, with migrations in `src/lib/progressModel.ts`.

- Every lesson check you attempt, and every signal-spotting or complexity drill item, becomes a review card, first due the next day.
- Boxes wait 1, 2, 4, 8, 16 and 32 days. A correct answer moves a card up a box; a miss sends it back to box 1.
- A topic's delayed re-check passes once 80% of its cards are answered well at least 20 hours after its checks were passed.

Export writes a JSON file. Import validates it with Zod and asks before overwriting anything. iOS can clear website data that hasn't been used for a while, so the app nudges you to export every couple of weeks.

## Quality

- Lighthouse (mobile): accessibility 100, best practices 100, performance 96 to 99 across every screen.
- axe-core: no violations, in light and dark themes, across every lesson step, every widget mid-run, the drills and a review session.
- Keyboard-only use works throughout. Focus rings are visible, tap targets are at least 44 px, and every animation respects reduced motion.
- About 190 KB of lesson content, about 50 KB of pattern content, and an 89 KB (gzipped) first download. Topics, widgets and secondary screens load on demand, and everything is precached for offline use.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions**. The base path comes from the repository name. CI (`.github/workflows/ci.yml`) runs the tests and build on every other branch and pull request.

No secrets, keys or private URLs belong in this repository. The build scans its output for common secret patterns and fails if it finds any.
