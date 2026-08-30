# Technical Decisions

Short record of what was chosen and why, so future sessions don't re-litigate.

## Stack

- **Astro 5** (static output), **TypeScript** (strict), **React integration
  installed but unused** on the research page — it exists so future Studio
  interactive islands work without restructuring.
- No component library, no Tailwind, no animation packages. Native CSS
  (scoped Astro styles + one small shared stylesheet per site area).

## Why Astro

- Static-first with zero client JS by default — the research homepage ships no
  JavaScript at all.
- Islands architecture: interactive React (or other framework) components can
  be added later exactly where needed (Studio canvas, previews) without
  affecting the rest of the site.
- Native MDX support when the Studio's creative project pages need it.
- First-class static hosting on GitHub Pages.

## Content storage

- All editable content lives in **typed TypeScript data files** under
  `src/data/` (`profile.ts`, `projects.ts`, `news.ts`, `education.ts`).
- Why not Astro content collections: at this scale (a handful of projects and
  news items on one page) collections add schema indirection without benefit.
  Plain typed arrays are the easiest thing to read and edit.
- When the Studio arrives with many MDX project pages, introduce content
  collections **for the Studio only**; the research data files can stay as they
  are.

## Styling boundaries

- `src/layouts/BaseLayout.astro` — only the document shell: `<head>`, meta/OG
  tags, favicon, and a minimal global reset (box-sizing, body defaults, focus
  states). No visual language.
- `src/styles/research.css` — shared research-page patterns (section labels,
  link rows). Imported **only** by `src/pages/index.astro`. The Studio must not
  import it.
- Component-specific styles are scoped `<style>` blocks inside each component.
- No global design system on purpose: the Studio is expected to define its own
  tokens/styles.
- ⚠️ CSS files must use `/* */` comments only — `//` comments silently break
  the CSS parser and can swallow the following rule (this bit the `:root`
  token block once).
- Research homepage layout: fixed first-screen desktop layout (header /
  hero+projects / bottom band / footer) with internal scrolling in the
  projects panel and news list; below 900px it switches to normal document
  flow.

## Asset paths & base URL

- GitHub Pages **project site**: `site: 'https://c-gayathri.github.io'`,
  `base: '/my-website'` in `astro.config.mjs`.
- Internal links and public assets must compose with
  `import.meta.env.BASE_URL` (see `BaseLayout.astro`). Assets imported through
  `astro:assets` are handled automatically.

## Deployment

- `.github/workflows/deploy.yml`: on push to `main`, `withastro/action@v3`
  installs/builds/uploads, `actions/deploy-pages@v4` publishes. Node version on
  CI is managed by the Astro action, independent of the local machine.
- One-time manual step: GitHub repo **Settings → Pages → Source: GitHub
  Actions**.
- Custom domain later: update `site`, set `base: '/'`, add `public/CNAME` —
  documented in the README.

## Deliberately deferred (for the Studio)

Do not add these until the Studio needs them:

- React islands / any client-side framework usage
- MDX + content collections for Studio projects
- GSAP / D3 / animation libraries
- Drag/pan/zoom or canvas interactions, custom pointer code
- Dark themes or any shared theming between research and Studio
