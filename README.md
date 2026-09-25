# Tzeva

Tzeva (Hebrew for "color") is a color wheel web app that installs on an iPhone home screen and works offline. Drag on the wheel to pick a color, read and enter hex codes, and see color harmonies with their hex codes.

Static site (React + TypeScript + Vite), no backend. See the PRD for the full spec.

## Develop

```
npm install
npm run dev     # http://localhost:5173/tzeva/
npm test        # unit tests for src/color.ts
npm run build
```

## Install on iPhone

Open the site in Safari, tap Share, then Add to Home Screen.

## Deploy

Every push to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
