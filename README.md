# Website — Gayathri Neela Chandran

A static personal website built with Astro 5, React, and MDX. It has two
deliberately separate areas:

- `/` — the minimal, zero-client-JavaScript research homepage.
- `/studio/` — the creative Studio: Constellation, clusters, projects, Writing
  pad, Bookshelf, Index, and About.

Because GitHub Pages serves this project below `/my-website`, the local Studio
URL is `http://localhost:4321/my-website/studio/`.

## Local development

Use Node 18.17 or newer; a current LTS release is recommended.

```bash
npm install
npm run dev
```

Before pushing changes:

```bash
npm run check
npm run build
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run check` | Validate Astro, TypeScript, and content schemas |
| `npm run build` | Generate the static site in `dist/` |
| `npm run preview` | Preview the production build |

## Routes

| Route | Content |
| --- | --- |
| `/` | Research profile, projects, education, and news |
| `/studio/` | Interactive Constellation |
| `/studio/clusters/[slug]/` | Projects and writing belonging to a cluster |
| `/studio/projects/[slug]/` | Individual creative project |
| `/studio/writing/` | Writing pad |
| `/studio/writing/[slug]/` | Individual writing entry |
| `/studio/bookshelf/` | Year-switchable Bookshelf and all-time favourites |
| `/studio/bookshelf/[slug]/` | Individual book/review |
| `/studio/index/` | Studio overview |
| `/studio/index/clusters/` | Complete cluster listing |
| `/studio/index/projects/` | Complete project listing |
| `/studio/about/` | About, education, news, links, and influences |

## Project structure

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages deployment
├── docs/                          # design, content, and technical notes
├── public/                        # files copied unchanged
├── src/
│   ├── assets/
│   │   ├── portrait.png
│   │   └── studio/
│   │       ├── covers/            # book-cover artwork
│   │       └── sample/            # project and influence images
│   ├── components/
│   │   ├── *.astro                # research components
│   │   └── studio/
│   │       ├── Constellation.tsx
│   │       ├── StudioNav.astro
│   │       ├── ProjectPreview.astro
│   │       └── blocks/            # reusable project MDX blocks
│   ├── content/
│   │   ├── books/                 # Markdown books and reviews
│   │   ├── clusters/              # Markdown Constellation clusters
│   │   ├── projects/              # MDX creative projects
│   │   └── writing/               # MDX Writing pad entries
│   ├── data/
│   │   ├── profile.ts             # research bio and social links
│   │   ├── projects.ts            # research projects
│   │   ├── news.ts                # research news
│   │   ├── education.ts           # research education
│   │   ├── studioAbout.ts         # Studio About content
│   │   ├── studioConfig.ts        # labels, palette, and reading goals
│   │   └── externalLinks.ts       # shared Studio links
│   ├── content.config.ts          # Studio collection schemas
│   ├── layouts/                   # separate Research and Studio shells
│   ├── lib/studio/                # Constellation geometry
│   ├── pages/                     # Astro routes
│   └── styles/                    # Research, Studio, and Constellation CSS
├── astro.config.mjs
└── package.json
```

## Adding content

Content filenames become URL slugs. Use lowercase kebab-case names such as
`magnolia-xrayed.mdx`. Image paths in frontmatter are relative to the content
file. Run `npm run check` after editing content; the authoritative field rules
are in `src/content.config.ts`.

### Research homepage

- Edit the biography and GitHub, LinkedIn, and Google Scholar links in
  `src/data/profile.ts`.
- Add research work to `src/data/projects.ts`; items render in array order.
- Add the newest research news item at the beginning of `src/data/news.ts`.
- Edit qualifications in `src/data/education.ts`.

Research projects have this shape:

```ts
{
  title: 'Project title',
  period: '2025–2026',
  affiliation: 'Institution · Advisor', // optional
  venues: [{ name: 'Venue', href: 'https://…' }], // optional
  description: ['First paragraph.', 'Second paragraph.'],
  links: [{ label: 'Paper', href: 'https://…' }], // optional
}
```

### Studio clusters

Create `src/content/clusters/my-cluster.md`:

```md
---
title: my / cluster
subtitle: a short secondary line
description: The description shown on the cluster page.
hoverDescription: Short text shown during Constellation hover.
hoverColor: '#2438ff'
featured: false
mobile:
  order: 10
connections:
  - line-study
  - going-out
---
```

Constellation positions are generated deterministically. Add `desktop` or
`generatedThenOverrideable` only for deliberate manual placement. Every value
in `connections` must match another cluster filename.

### Studio projects

Put artwork in `src/assets/studio/`, then create
`src/content/projects/my-project.mdx`:

```mdx
---
title: my project
year: 2026
clusters: [my-cluster]
types: [image]
medium: [ink, digital]
tags: [study]
summary: A short description used in previews.
previewType: image
hero: ../../assets/studio/sample/my-image.png
pageType: simple
pageLayout: image-dominant
size: medium
relatedWriting: []
---

Optional project text goes here.
```

- `previewType`: `image`, `gallery`, `video`, `text`, `media-text`, or `custom`.
- `pageType`: `simple`, `mdx`, or `custom`.
- `pageLayout`: `image-dominant`, `side-caption`, or `offset`.
- Optional media fields include `thumbnail`, `hero`, `gallery`, `videoSrc`,
  `videoPoster`, `youtubeUrls`, and `textExcerpt`.
- `clusters` and `relatedWriting` use filename slugs without extensions.
- For composed project pages, use `pageType: mdx` and blocks from
  `src/components/studio/blocks/`.

### Writing pad

Create `src/content/writing/my-entry.mdx`:

```mdx
---
title: my entry
date: 2026-09-02
type: fragment
excerpt: A short preview excerpt.
pageLayout: fragment
relatedProjects: [my-project]
preview:
  variant: fragment
---

Write the poem, essay, fragment, or mixed entry here.
```

`type` may be `poem`, `essay`, `fragment`, or `mixed`. `pageLayout` accepts
those values plus `custom`. Optional `image` and `gallery` fields use relative
asset paths.

### Bookshelf and reviews

Add the cover under `src/assets/studio/covers/`, then create
`src/content/books/my-book.md`:

```md
---
demo: false
title: Book title
author: Author Name
cover: ../../assets/studio/covers/my-book.svg
yearRead: 2026
rating: 4.5
dateFinished: 2 September 2026
featured: false
recommended: true
excerpt: A short review preview.
goodreadsLink: https://www.goodreads.com/…
---

Write the review here. Leaving the body empty creates an unreviewed book.
```

- The latest available `yearRead` opens by default.
- Reading targets live in `studioConfig.readingChallenge`.
- `featured: true` adds a book to **All time favourites** and has no other use.
- The reviewed badge appears when the Markdown body contains review text.

### Studio About, navigation, and links

- Edit the About statement, paragraphs, education, skills, internal news, and
  influences in `src/data/studioAbout.ts`.
- Influence `file` values refer to files in `src/assets/studio/sample/`.
- Edit the Studio name, tagline, labels, hover palette, and reading goals in
  `src/data/studioConfig.ts`.
- Edit Instagram, Substack, blog, and shared links in
  `src/data/externalLinks.ts`; empty optional links are omitted.

### Portrait

The shared portrait is `src/assets/portrait.png`. Replace that file directly,
or update its imports in the research homepage and Studio About page if the
filename or format changes. Astro optimizes it during the build.

## Deployment

Pushes to `main` deploy through `.github/workflows/deploy.yml` to
`https://c-gayathri.github.io/my-website/`.

`astro.config.mjs` sets `base: '/my-website'`. If the repository name changes,
update that value. For a custom domain, also update `site`, change `base` to
`'/'`, add the domain configuration, and verify a production preview.

## Further documentation

- `docs/project-vision.md` — scope and design intent.
- `docs/content-model.md` — detailed Studio content model.
- `docs/studio-design-system.md` — current layout and interaction rules.
- `docs/constellation-geometry.md` — authoritative Constellation geometry.
- `docs/technical-decisions.md` — architectural constraints.
- `HANDOFF.md` — current implementation and validation status.
