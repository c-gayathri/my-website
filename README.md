# Website — Gayathri Neela Chandran

Personal site built with [Astro](https://astro.build). Two parts:

- **`/`** — professional research homepage (this page; extremely minimal, zero client-side JavaScript)
- **`/studio`** — experimental creative site with a constellation homepage,
  clusters, projects, writing, bookshelf, directory, and about page

See `docs/project-vision.md` for the long-term plan and `docs/technical-decisions.md` for how the project is put together.

## Run locally

Requires Node 18.17+ (Node 20/22/24 LTS recommended).

```bash
npm install        # first time only
npm run dev        # dev server at http://localhost:4321
```

## Commands

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Local dev server with hot reload              |
| `npm run build`   | Static build into `dist/`                     |
| `npm run preview` | Serve the built `dist/` folder locally        |
| `npm run check`   | Type-check all `.astro` files (run before pushing) |

## Where content lives

**You should almost never need to touch `src/components/` or `src/pages/`.**
All text is in small, typed files under `src/data/`:

| File               | Contents                                                        |
| ------------------ | --------------------------------------------------------------- |
| `src/data/profile.ts` | Name, role, intro paragraphs, GitHub/LinkedIn links, the "outside research" sentence |
| `src/data/projects.ts` | All research projects (see below)                          |
| `src/data/news.ts`  | News items, newest **first**                                    |
| `src/data/education.ts` | Education entries                                           |

Each file has comments at the top explaining its shape. TypeScript will flag mistakes (e.g. a missing required field) in your editor and in `npm run check`.

## Editing projects

Open `src/data/projects.ts`. Projects render in **list order** — put the most
important one first. Each project looks like:

```ts
{
  title: '…',
  period: '2024–2025',
  affiliation: 'Institution · Advisor',          // optional
  venues: [                                      // optional; any number
    { name: 'ARLET Workshop, NeurIPS 2025', href: 'https://…' },  // href optional
  ],
  description: ['Paragraph one.', 'Paragraph two.'],
  links: [{ label: 'Paper', href: 'https://…' }], // optional; row only renders when present
}
```

All project titles share the same size. The `links` row (Paper · Code ·
Slides) is currently not shown for any project — add a `links` array to any
project whenever you have URLs and it appears automatically.

## Replacing the portrait

The portrait is picked up **automatically** — no code changes:

1. Save your photo as `src/assets/portrait.jpg` (or `.png`/`.webp`/`.jpeg`), replacing the file that is there.
2. Delete any old `portrait.*` file you are no longer using.

That's it. Astro optimizes and resizes the image at build time (a multi-MB
photo becomes a few tens of KB on the page), and the width/height attributes
prevent layout shift.

## Editing news

Open `src/data/news.ts` and add an entry at the **top** of the array:

```ts
{ date: 'May 2026', text: 'Short update sentence.', href: 'https://…' } // href optional
```

## Deployment (GitHub Pages)

The site deploys automatically: **every push to `main` builds and publishes the site** via `.github/workflows/deploy.yml`. No build step on your machine is needed for deployment.

One-time setup:

1. Create the GitHub repo `c-gayathri/my-website` (if not done yet) and push:

   ```bash
   git remote add origin git@github.com:c-gayathri/my-website.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. That's it — the first push (or the "Run workflow" button in the Actions tab) publishes to `https://c-gayathri.github.io/my-website/`.

### Base path

Because this is a *project site*, `astro.config.mjs` sets `base: '/my-website'`. If you ever rename the repo, update that one line. If you later point a **custom domain** at the site: set `site` to your domain, change `base` to `'/'`, add a `CNAME` file to `public/`, and configure DNS per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Project structure

```
src/
├── assets/        # images processed by Astro (portrait lives here)
├── components/    # Hero, ProjectEntry, Education, NewsList, SiteHeader
├── data/          # ★ ALL editable content
├── layouts/       # BaseLayout — <head>/meta + global reset only
├── pages/         # index.astro (research) · studio/ routes
└── styles/        # research.css — imported ONLY by the research page
```

The future Studio gets its own layout and styles; nothing on the research page depends on them.
