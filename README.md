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

All lesson content lives under `/content` as JSON and is checked against the Zod schemas in `src/content/schema.ts`. `npm run build` fails on invalid content. To add a module, edit `content/modules.json` and add that module's topic files. No other code changes are needed unless the module needs a new widget.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions**. The base path comes from the repository name.

## Install on iPhone

Open the site in Safari, tap Share, then tap **Add to Home Screen**. After the first load it works offline.
