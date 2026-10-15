# Alessandro Lollo · Career database

A static portfolio for technical and executive recruiters, organized like a modern database explorer. Based on the **Refactor CV UX** proposal: one set of career records, multiple useful perspectives.

Visual previews: [desktop overview](docs/previews/overview-light.png), [leadership record panel](docs/previews/leadership-record.png), and [mobile dark theme](docs/previews/mobile-dark.png).

## Stack

- **Astro** prerenders the overview and résumé as static HTML for GitHub Pages.
- **React + TypeScript** power one shared explorer island.
- **Tailwind CSS** and semantic CSS tokens support light/dark themes and responsive layouts.
- Owned **shadcn/ui-style Button and Sheet** primitives use class-variance-authority and Radix Dialog. `components.json` configures future shadcn additions; the Sheet supplies focus management, Escape handling, and a full-width mobile panel.
- **TanStack Table** handles sorting. Shared search, focus filtering, and saved views operate on typed records.
- **Lucide** supplies interface icons; YAML/Markdown hold content; Zod validates data and cross-references at build time.
- **Playwright** runs regression tests and generates a real, tagged, selectable-text PDF from the printable résumé.

No backend, database service, analytics, or runtime credentials are required. The SQL strip describes the current view; it is not an arbitrary SQL editor. A free-form SQL playground remains an optional later addition.

## Development

Use Node **22.12+** (CI uses Node 22).

```sh
npm ci
npx playwright install chromium
npm run build
npm run dev
```

Build once to prepare the PDF download in development. Rebuild after changing résumé content to refresh it. `npm run dev` starts the site at `/alelollo-online-cv/`; `npm run preview` serves the production output. Both normally use port 4321. The build runs Astro's type checks, generates static pages, and exports the PDF. In a managed environment with Chromium already installed, set `CHROMIUM_PATH=/usr/bin/chromium` instead of downloading a browser. Set `ASTRO_TELEMETRY_DISABLED=1` to disable Astro telemetry and `npm_config_cache` to a writable directory if the home directory is read-only.

## Content and interaction

- `_data/data.yml` remains the original résumé source for roles, technologies, education, contact details, and contributions. Roles have stable IDs that survive reordering.
- `_data/explorer.yml` contains curated focus areas, saved-view membership, evidence links, selected outcomes, and case studies. Summaries must remain supported by the underlying résumé; general tool familiarity must not be presented as technology used at a particular employer without evidence.
- `src/lib/career.ts` validates both files and resolves their references. Missing metadata, duplicate IDs, and invalid references fail the build.
- **Overview** surfaces the current role, positioning, catalog adoption, team leadership, and open-source work.
- **Tables** expose Experience, Projects, Skills, Open source, and Education. Projects use Problem → Decision → Delivery → Outcome and link back to supporting experience.
- **Saved views** Engineering, Leadership, and Business impact filter the same records, including related projects and contributions.
- Skills reveal evidence records instead of percentage ratings. Global search spans roles, projects, contributions, and the career-wide technology inventory; Ctrl/⌘ K focuses it. Results support sorting, text search, and focus filtering.
- Record links use stable hashes, e.g. `#leadership/record/cuebiq`. The detail panel traps focus, closes with Escape, and restores focus to the source record. Mobile uses cards and a full-width detail panel.
- The no-JavaScript fallback includes the full role descriptions and links to `/print/`. The printable résumé works without client rendering or external scripts. A persistent Download CV link serves the PDF generated from the same content.

Light/dark theme preference follows the system initially and persists locally when storage is available. Reduced-motion preferences are respected. No fonts, scripts, or CSS are loaded from a CDN.

## Validation

```sh
npm run build
npm test
```

Playwright starts the production preview automatically. Tests cover saved-view membership, shared records, search and sorting, empty results, deep links, evidence navigation, keyboard focus, theme persistence, 320/390/768/1440px layouts, no-JavaScript reading, asset paths, and the PDF download. `CV_BASE_URL` targets an already running site; `CHROMIUM_PATH` selects an existing Chromium executable. Tests use a real browser; install it before building because PDF export needs it too.

## GitHub Pages

The workflow validates PRs and deploys successful `main` builds through GitHub Actions. Set **Settings → Pages → Build and deployment → Source → GitHub Actions** when adopting this migration. The default base path is `/alelollo-online-cv`, matching the repository URL. `PUBLIC_BASE_PATH=/` builds for a root/custom domain; set `site` in `astro.config.mjs` and place your own CNAME in `public/` if using a custom domain. Do not restore the upstream theme's `online-cv.webjeda.com` CNAME.

`dist/` is the complete deployable artifact, including `.nojekyll`, local images/assets, `/print/index.html`, and `alessandro-lollo-cv.pdf`. No Ruby, Jekyll, Docker, or server process is needed to serve it. Old Orbit/Jekyll theme sources are retained for provenance but are not part of the Astro build or published output. Astro configuration replaces `_config.yml`; the obsolete Ruby and Docker entry points have been removed. See `THIRD_PARTY_NOTICES.md` and `LICENSE.md` for attribution.
