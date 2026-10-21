# crackIT

A personal study app for rebuilding computer science foundations from first principles, aimed at UK graduate interviews and assessment centres. It is a static, installable PWA with no backend, accounts or tracking. Progress stays in your browser, and you can export it as a JSON file.

Live: https://hantytherleigh.github.io/crackIT/

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/crackIT/
npm test           # Vitest
npm run build      # validate content, typecheck, build, scan dist for secrets
npm run preview    # serve the production build (service worker included)
npm run icons      # re-render PNG icons from public/icons/icon.svg
```

## Content

All lesson content lives under `/content` as JSON and is checked against the Zod schemas in `src/content/schema.ts`. `npm run build` fails on invalid content, on a topic file the module map doesn't reference, and on a mismatched id or unknown prerequisite.

A topic file (see `content/dsa/01-big-o.json`) holds, in lesson order:

- `recallPrompts`: asked before any explanation.
- `mentalModel`: an analogy, then sections, each with optional `code` (`ts` and `py`) and an optional `widget`.
- `explainBack`: a prompt and a self-check rubric, with an optional `passMark`.
- `checks`: `choice`, `text` (answers are normalised, so `O(n²)` matches `o(n^2)`) or `number` questions, each with a hint ladder of nudge, then pattern, then approach.
- `handsOn`: a task whose reference answer stays hidden behind "I tried it".
- `commonMistakes` and `prerequisites`.

Text fields accept a small Markdown subset: paragraphs, `- ` lists, `|` tables, code fences, `**bold**`, `*emphasis*` and `` `code` ``.

To add a topic, write its file and add `"file"` to its entry in `content/modules.json`. To add a module, add it to `modules.json` with its topic files. No code changes are needed unless the module needs a new widget.

## Pattern trainer

`content/patterns.json` holds the 16-pattern catalogue: a recognition cue, signal words, typical cost, a template in TypeScript and Python, examples, and look-alike patterns. Drills live in `content/drills/`:

- `signal-spotting.json`: problems where you pick the pattern and tick the cue words. The build checks that every tickable phrase appears in its statement.
- `lookalikes.json`: pairs of similar problems that need different patterns, with a model answer and rubric.
- `complexity-prediction.json`: describe an approach and predict its Big O.

Answered signal-spotting and complexity items become review cards, so they mix with lesson checks in the Review queue (or alone at `#/review?only=patterns`).

## Progress and mastery

Progress is stored in `localStorage` (`crackit.progress`, versioned, with migrations in `src/lib/progressModel.ts`). A topic is **solid** only after 80% of its checks are passed without revealing the answer, the explain-back rubric reaches its pass mark, and a delayed re-check in Review is passed. Export writes a JSON file. Import validates it with Zod and asks before overwriting anything.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions**. The base path comes from the repository name.

## Install on iPhone

Open the site in Safari, tap Share, then tap **Add to Home Screen**. After the first load it works offline.
