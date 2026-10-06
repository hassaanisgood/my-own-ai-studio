# Northlight Creative Studio

A dark, focused workspace for generating images and videos from multiple AI models. Everything runs locally against a **mock provider**: no external AI APIs are called, no credentials exist anywhere in the code, and all model names, capabilities and prices are **illustrative mock configuration**, not verified availability or pricing.

Built with Next.js (App Router), TypeScript and Tailwind CSS.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run test:e2e` | Playwright end-to-end suite (starts the dev server if needed) |
| `npm run assets` | Re-render the placeholder imagery and video (needs Python 3, numpy, Pillow, ffmpeg) |

## What's in the app

- **Create** has one workspace with **Image** and **Video** tabs. It includes a prompt with examples and a Ctrl/⌘+Enter shortcut, a model picker, aspect ratio, resolution, output count or duration, and an optional reference image for video. The Generate bar shows the selected model, its description, its settings and the **estimated mock cost**.
- **Results** show queued and generating jobs with clearly labelled **simulated progress**, plus cancel, failed states with retry, and a gallery of finished generations. Each result offers Download (saves the exact file shown), Favorite, Copy prompt, Generate again (restores the prompt and every setting, then runs), and a details view.
- **Generations** is your history in a masonry grid, with All / Images / Videos filters, prompt search and sorting. It starts with sample generations, which you can remove from Settings.
- **Favorites** lists everything you've marked with a heart.
- **Settings** covers default models, cost display, video looping, motion preference, mock-provider controls and data management.

### Testing failures deterministically

- Put `[fail]`, `[fail:timeout]` or `[fail:policy]` anywhere in a prompt and the run fails every time. `policy` is non-retryable and offers *Edit prompt* instead of *Retry*.
- Settings → Mock provider → **Fail next run** fails exactly one run and then resets, so **Retry** succeeds. **Fail every run** keeps failing.
- **Simulation speed → Fast** shortens runs to 1–3 seconds.

Failed and canceled runs never enter history.

## Customising

| What | Where |
| --- | --- |
| Studio name, descriptor, logo (built-in mark or monogram), colours, download filename prefix | `src/config/studio.ts` |
| Models, capabilities, defaults and mock pricing | `src/config/models.ts` |
| Design tokens (surfaces, text, accent) | `src/app/globals.css` (`@theme`) |

To add a model, append it to `IMAGE_MODELS` or `VIDEO_MODELS`. The pickers, option lists, validation and cost estimates all derive from that catalog.

## Architecture

```
src/
  config/            studio branding + model catalog (single source of truth)
  lib/
    providers/       GenerationProvider interface, mock provider, registry
    mock/            placeholder asset catalog + sample history
    storage/         localStorage (history, favorites, settings, drafts) + IndexedDB (uploaded files)
    pricing.ts       cost estimates from the catalog
    validation.ts    prompt + capability validation
    drafts.ts        per-mode drafts, model switching
  state/             StudioProvider (jobs, history, persistence) + feedback (toasts, live regions)
  components/        shell, create (composer), results (cards, jobs, dialog, gallery), ui primitives
```

### Connecting a real provider

The UI only talks to providers through `GenerationProvider` (`src/lib/providers/types.ts`):

```ts
generate(request, { signal, onUpdate }) => Promise<{ outputs, providerJobId }>
```

Providers report `queued` and `running` updates. `running` carries an optional `progress` and a `simulated` flag, so real provider status replaces the simulated bar without UI changes. Throw `GenerationError(code, message, retryable)` for failures, and honour `signal` for cancellation.

To go live:

1. Add a server-side route handler (e.g. `src/app/api/generate/route.ts`) that reads the API key from an environment variable, calls the vendor and exposes job status. **Never ship keys to the browser.**
2. Implement a client `GenerationProvider` that calls that route and polls or streams status into `onUpdate`.
3. Register it in `src/lib/providers/registry.ts` and set `providerId` on the relevant models in `src/config/models.ts`.
4. Return real asset URLs. If assets must persist, store them (or their blobs, via the IndexedDB helpers) instead of relying on expiring vendor URLs.

## Persistence

History, favorites, settings, the current mode and per-mode drafts are saved to `localStorage`. Uploaded reference images are saved to IndexedDB, with an in-memory fallback. Every storage call is wrapped. If storage is blocked or full, the studio keeps working for the session and shows a single notice; Settings shows a persistent warning.

## Accessibility

- Skip link, landmarks, labelled controls, and native radios for every option group (arrow keys work). Tabs follow the ARIA tabs pattern, and the details view is a modal `<dialog>` that returns focus to whatever opened it.
- Visible focus rings everywhere. Scroll padding keeps focused controls clear of the sticky header and the Generate bar.
- Generation status changes (queued, generating, complete, failed, canceled) are announced through live regions. Individual progress ticks are not.
- Respects `prefers-reduced-motion`. Settings can force reduced or full motion.
- The e2e suite runs axe (WCAG 2.1 A/AA) on every page.

## Placeholder assets

All imagery and video in `public/mock` is procedurally generated by `scripts/generate_assets.py`: abstract, product and landscape scenes with no third-party or copyrighted material. Each clip ships as H.264 MP4 plus a VP9 WebM alternate. The player and Download both pick the same playable source.

## End-to-end tests

`e2e/` covers:

- image and video generation
- validation and capability conflicts
- failure, retry and cancellation
- video playback
- byte-exact downloads
- clipboard
- favorites and history filters
- generate again
- persistence after refresh
- storage failures
- keyboard navigation
- reduced motion
- axe checks
- mobile layouts with no horizontal scroll

To use a preinstalled Chromium instead of Playwright's download:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e
```
