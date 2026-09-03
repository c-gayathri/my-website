# Website — Gayathri Neela Chandran

A static personal website built with Astro 5, React, and MDX. It has two deliberately separate areas:

- `/` — the minimal, zero-client-JavaScript research homepage.
- `/studio/` — the creative Studio: Constellation, clusters, projects, Writing pad, Bookshelf, Index, and About.

Because GitHub Pages serves this project below `/my-website`, the local Studio URL is `http://localhost:4321/my-website/studio/`.

## Local development

Use Node 18.17 or newer; a current LTS release is recommended.

```bash
npm install
npm run dev
```

Before pushing changes:

```bash
npm run check     # validates Astro, TypeScript, and content schemas (see src/content.config.ts)
npm run build     # generates static site in dist/
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run check` | Validate Astro, TypeScript, and content schemas |
| `npm run build` | Generate the static site in `dist/` |
| `npm run preview` | Preview the production build |

> Run `npm run check` after every content edit. The authoritative field rules are in `src/content.config.ts` — if a required field is missing or a value is outside its enum, the check will fail with the exact file and line.

### Adding a new cluster

1. Create `src/content/clusters/<new-id>.md` with `title`, `description`, `hoverColor` etc. (see field tables below).
2. Append `"<new-id>"` to `src/data/clusterOrder.ts` (bottom = outer ring). The top 6 in that file are the focus window.
3. If the cluster has projects, add their ids to `src/data/projectOrder.ts[<new-id>]` (new projects at top). Run `npm run check` — the constellation regenerates deterministically at next `dev`/`build` using `studioConfig.layoutSeed` (tweak the seed if you want a new random set). No manual placement needed; the world grows as `sqrt(N/6)*1.25` so new clusters go to the edge.

### Adding a new project

1. Put images in `src/assets/studio/clusters/<cluster>/` (or `src/assets/studio/` for shared). Use kebab-case filenames (`my-work.jpg`, not `IMG_1234.JPG`).
2. Create `src/content/projects/<slug>.mdx` with `title`, `year`, `clusters: ["<cluster>"]`, `hero`/`gallery` paths (quoted if they contain spaces), `featured: true` (≤5 per cluster) and `featuredImage: "my-work.jpg"` (one image to represent it in the collage).
3. Add the slug to the top of `src/data/projectOrder.ts[<cluster>]`. If the project belongs to multiple clusters, add it to each relevant array — the Index “all projects” list will dedup (first cluster wins).
4. Choose `layoutMode: "image-first"` (default `large`/`contain`, gallery is a 3-col grid, <9 images vertically centered, 2 images → 1fr 1fr full-width) or `layoutMode: "writing-first"` (ordered blocks: `Image`/`Gallery`/`Text`/`Quote` in MDX body). For `writing-first`, put a cover `<Image>` at top and an end-row `<ImagePair>` for the last two images.

### For audio

* Self-hosted: `audioSrc: "../../assets/studio/audio/track.mp3"` (store under `public/audio/` or `src/assets` — works on GitHub Pages <100 MB) → renders `<audio controls>`.
* Embed: `audioUrls: ["https://soundcloud.com/..."]` or YouTube `youtubeUrls` for video (both work in either mode).

---

## Routes

| Route | Content |
|---|---|
| `/` | Research profile, projects, education, and news (data in `src/data/`) |
| `/studio/` | Interactive Constellation |
| `/studio/clusters/[slug]/` | Projects and writing belonging to a cluster |
| `/studio/projects/[slug]/` | Individual creative project |
| `/studio/writing/` | Writing pad (index) |
| `/studio/writing/[slug]/` | Individual writing entry |
| `/studio/bookshelf/` | Year-switchable Bookshelf and all-time favourites |
| `/studio/bookshelf/[slug]/` | Individual book/review |
| `/studio/index/` | Studio overview |
| `/studio/index/clusters/` | Complete cluster listing |
| `/studio/index/projects/` | Complete project listing |
| `/studio/about/` | About, education, news, links, and influences |

## Project structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages deployment
├── docs/                          # design, content, and technical notes
├── public/                        # files copied unchanged to dist/
├── src/
│   ├── assets/
│   │   ├── portrait.png           # research homepage portrait (unchanged)
│   │   ├── about.jpg              # studio About portrait (3:4, see below)
│   │   └── studio/
│   │       ├── covers/            # book-cover artwork (jpg/jpeg/png/svg)
│   │       ├── clusters/          # source images for projects, organised by cluster
│   │       ├── writing/           # source text + images for writing entries
│   │       ├── Influences/        # images for the About → Influences grid
│   │       └── goodreads_library_export.numbers
│   ├── components/
│   │   ├── *.astro                # research components (Hero, etc.)
│   │   └── studio/
│   │       ├── Constellation.tsx         # desktop camera constellation
│   │       ├── ConstellationMobile.tsx   # mobile tall-scroll constellation
│   │       ├── ConstellationRoot.tsx     # desktop/mobile switch (≤760px)
│   │       ├── StudioNav.astro
│   │       ├── ProjectPreview.astro
│   │       └── blocks/            # reusable MDX blocks (see below)
│   ├── content/
│   │   ├── books/                 # Markdown books and reviews
│   │   ├── clusters/              # Markdown constellation clusters
│   │   ├── projects/              # MDX creative projects
│   │   └── writing/               # MDX Writing pad entries
│   ├── data/
│   │   ├── profile.ts             # research bio and social links (research only)
│   │   ├── projects.ts            # research projects (research only)
│   │   ├── news.ts                # research news (research only)
│   │   ├── education.ts           # research education (research only)
│   │   ├── studioAbout.ts         # Studio About content (statement, education, skills, news, influences)
│   │   ├── studioConfig.ts        # Studio name, labels, constellation, reading goals
│   │   └── externalLinks.ts       # shared Studio links (instagram, substack, blog, goodreads)
│   ├── content.config.ts          # Studio collection schemas (authoritative)
│   ├── layouts/                   # separate Research and Studio shells
│   ├── lib/studio/                # Constellation geometry
│   ├── pages/                     # Astro routes
│   └── styles/                    # research.css, studio.css, constellation.css
├── astro.config.mjs
└── package.json
```

**Content filenames become URL slugs.** Use lowercase kebab-case names such as `magnolia-xrayed.mdx`. Image paths in frontmatter are **relative to the content file** (e.g. `../../assets/studio/covers/my-book.jpg` from `src/content/books/`).

---

## Adding content — field reference

This section is exhaustive. **Mandatory** fields must be present or `npm run check` will fail. **Optional** fields have defaults. Enum “modes” are listed with what each one does.

### Studio clusters — `src/content/clusters/<slug>.md`

Create `src/content/clusters/my-cluster.md`:

```md
---
title: "My Cluster"
description: "One-sentence description shown on the cluster page."
subtitle: "optional secondary line under the title"
hoverDescription: "Short text shown during Constellation hover (desktop) and after tap (mobile)."
hoverColor: "#2438ff"
featured: false
mobile:
  order: 10
  width: full
  align: left
connections:
  - other-cluster
  - another-cluster
---

# No body — clusters are frontmatter-only. The description above is the page content.
```

| Field | Required | Type / Modes | What it does |
|---|---|---|---|
| `title` | **Yes** | `string` | Cluster title on constellation plate and cluster page. **Quote it** if it contains `:` (e.g. `"Women: With / Without Eyes"`). |
| `description` | **Yes** | `string` | Shown at top of `/studio/clusters/<slug>/`. Keep short; you can leave it as `""` and fill later. **Quote if it contains `:`.** |
| `subtitle` | No | `string` | Smaller line under the title on the cluster page. |
| `hoverDescription` | No | `string` | Text in the hover/tap info panel. Falls back to `description` if omitted. |
| `hoverColor` | No | CSS colour `string` (e.g. `"#ff2e88"`) | Splash colour when hovering/tapping the cluster. Defaults to the curated `studioConfig.palette` round-robin. |
| `featured` | No | `boolean` `false` (default) | If `true`, the cluster frames the initial constellation view on desktop. |
| `mobile.order` | No | `number` (`99` default) | Sort order for the mobile tall-scroll constellation (lower = higher). |
| `mobile.width` | No | `string` `"full"` (default) | Width hint for the mobile cluster collage (reserved for future). |
| `mobile.align` | No | `left` / `center` / `right` (`left` default) | Horizontal alignment hint on mobile. |
| `connections` | No | `string[]` | Other cluster slugs to draw constellation lines to. Must match existing cluster filenames. |
| `desktop` | No | `{x, y, width, driftRadius, depth}` | **Manual world-space override.** Only add for deliberate placement. `x,y` in world units (0–2600, 0–1700), `width` default 420, `driftRadius` 10, `depth` 0.6–1.4 (parallax). |
| `generatedThenOverrideable` | No | `{x:0..1, y:0..1, width:0.05..0.4}` | Normalized override applied after deterministic generation (0..1 anchors). Prefer over `desktop` for small nudges. |

**10 canonical clusters** currently: `album-art`, `eyes`, `color-pop`, `minimalism`, `photo-edits`, `photography`, `realism`, `watercolours`, `women-eyes`, `writing-art`. Each top-level folder in `assets/studio/clusters/` maps to one.

> **Dedup rule:** If the same image or subfolder (e.g. `Meenakshi` 5 PNGs) appears under multiple cluster folders, create **one** project and list all clusters in its `clusters: [eyes, color-pop, women-eyes]`.

---

### Studio projects — `src/content/projects/<slug>.mdx`

Put artwork in `src/assets/studio/` (e.g. `clusters/color-pop/…` or `covers/…`), then create `src/content/projects/my-project.mdx`.

**Minimal example (single image):**

```mdx
---
title: "My Project"
year: 2026
clusters: [eyes]
types: ["image"]
medium: ["watercolour"]
tags: ["study"]
summary: "One-line summary used in previews — leave empty and fill later if you prefer."
previewType: image
hero: "../../assets/studio/clusters/eyes/self portrait.jpg"
pageType: simple
pageLayout: image-dominant
size: medium
relatedWriting: []
---

Optional body text — only visible when `previewType: text` (see modes below).
```

**Gallery folder example** (subfolder `Subliminal` with 3 PNGs + `Untitled.txt`):

```mdx
---
title: "Subliminal"
year: 2025
clusters: [photo-edits, writing-art]
types: ["image"]
previewType: gallery
hero: "../../assets/studio/clusters/Photo edits/Subliminal/IMG_1215.PNG"
gallery:
  - "../../assets/studio/clusters/Photo edits/Subliminal/IMG_1215.PNG"
  - "../../assets/studio/clusters/Photo edits/Subliminal/IMG_1216.PNG"
  - "../../assets/studio/clusters/Photo edits/Subliminal/IMG_1217.PNG"
pageType: mdx
size: medium
---

Use MDX blocks for composed pages (see Image placement below). The `Untitled.txt` content goes here.
```

| Field | Required | Type / Modes | Notes |
|---|---|---|---|
| `title` | **Yes** | `string` | Project title. Quote if it contains `:`. |
| `year` | **Yes** | `int` | Year shown on the project page and used for sorting. |
| `date` | No | `string` | Optional precise date (e.g. `"2025-06-14"`). |
| `clusters` | No | `string[]` | Cluster slugs this project belongs to. Use `[]` if none. One project can belong to multiple clusters (dedup). |
| `types` | No | `string[]` | Free-form, e.g. `["image"]`, `["image","series"]`. Used for filtering, not styling. |
| `medium` | No | `string[]` | e.g. `["watercolour","ink"]`, `["digital","photography"]`. Shown in the left rail. |
| `tags` | No | `string[]` | Free-form. |
| `summary` | No | `string` | One-line preview summary. Leave `""` if you will fill later — no placeholder is inserted. |
| `previewType` | No | `image` (default) / `gallery` / `video` / `text` / `media-text` / `custom` | **What the preview card shows:** `image` = `hero`, `gallery` = `hero` + count badge, `video` = `videoSrc` with play overlay, `text` = large italic `textExcerpt`/`summary`, `media-text` = `hero` + `summary` side-by-side, `custom` = requires `customComponent`. |
| `hero` | No | `image()` | Main image path relative to the file. Leave empty if no image. Paths with spaces **must be quoted**: `hero: "../../assets/studio/clusters/album art/IMG_0794.PNG"`. |
| `thumbnail` | No | `image()` | Optional smaller preview; falls back to `hero`. |
| `gallery` | No | `image[]` | Additional images. Shown as a row under the stage on `simple` pages. Quote paths with spaces. |
| `videoSrc` | No | `string` | Path to `.mp4`/`.mov` under `assets/` (e.g. `"../../assets/studio/clusters/eyes/IMG_1272.mp4"`). Use with `previewType: video`. |
| `videoPoster` | No | `image()` | Poster for `videoSrc`. |
| `youtubeUrls` | No | `string[]` (`url`) | One or more YouTube URLs — rendered as embeds. |
| `textExcerpt` | No | `string` | Large italic pull-quote when `previewType: text`. |
| `pageType` | No | `simple` (default) / `mdx` / `custom` | `simple` = left rail + single artwork (fits viewport) + optional `gallery` row. `mdx` = modular editorial page using blocks (see below). `custom` requires `customComponent`. |
| `pageLayout` | No | `image-dominant` (default) / `side-caption` / `offset` | Preset for `simple` pages. Currently hooks as `layout-*` class for future styling — `image-dominant` is the default. |
| `size` | No | `small` / `medium` (default) / `large` | **Viewport fit** on `simple` pages: `small` caps at ~560px wide, `medium` fits the viewport (`max-height: calc(100dvh - 190px)`), `large` breaks out (`max-height: none; width: 100%` — scrollable presentation). Add as `size: large` to let a tall image scroll. |
| `relatedWriting` | No | `string[]` | Writing slugs (filenames without extension) to link under “related writing” in the rail. |
| `clusterPreview` | No | `{x,y,width,align,featured}` | Manual placement inside the cluster page (rare; omit). |
| `mobile` | No | `{order,width,align}` | Mobile ordering hint for cluster-page card. |

**Body visibility:** On `pageType: simple`, the Markdown body after `---` is **only rendered** when `previewType: text` (as a `blockquote` under the pull-quote). For `image`/`gallery`/`video` simple pages the body is ignored — put composed content in a `pageType: mdx` file instead.

---

### Writing pad — `src/content/writing/<slug>.mdx`

Create `src/content/writing/my-entry.mdx`:

```mdx
---
title: "My Entry"
date: 2026-09-02
type: fragment
excerpt: "One-line preview for the writing index — leave empty if you prefer."
image: "../../assets/studio/writing/Pain is red/Pain is red.jpg"
gallery:
  - "../../assets/studio/writing/the city that grows upwards/6e63e87a-79f6-4d20-bfb2-9e1f79cd102f_1080x1206.webp"
relatedProjects: [meenakshi]
pageLayout: fragment
preview:
  variant: fragment
  showDate: true
  showType: true
---

Write the poem, essay, fragment, or mixed entry here. You can also import blocks.
```

| Field | Required | Type / Modes |
|---|---|---|
| `title` | No | `string` | Display title. Some fragments omit it (poem without title). |
| `date` | **Yes** | `coercible date` (`YYYY-MM-DD`) | Used for sorting (newest first on the index, featured first). |
| `type` | No | `poem` / `essay` / `fragment` (default) / `mixed` | Semantic type, shown as a small label if `preview.showType` is true. |
| `excerpt` | No | `string` | Preview excerpt on the index. Leave `""` to omit. |
| `image` | No | `image()` | Lead image above the prose. Relative path, quote if it has spaces. |
| `gallery` | No | `image[]` | Additional images (rendered where you place them, or unused). |
| `relatedProjects` | No | `string[]` | Project slugs to link. |
| `pageLayout` | No | `essay` / `poem` / `fragment` (default) / `mixed` / `custom` | **Text style** (see § Paragraph styles). `essay` = serif 19.5px, `poem`/`fragment` = mono. |
| `preview.variant` | No | `title-excerpt` / `minimal` / `fragment` / `image-text` | Index card style. `fragment` shows a larger serif excerpt. |
| `preview.showDate` | No | `boolean` `true` | Show the date on the index. |
| `preview.showType` | No | `boolean` `true` | Show the `type` label. |
| `preview.excerptLength` | No | `number` | Truncation hint (reserved). |
| `preview.featured` | No | `boolean` | If `true`, the entry sorts to the top of the index. |
| `preview.desktop`/`preview.mobile` | No | `{x,y,width,align}` / `{order,width}` | Pinning hints (rare). |

**Word-count heuristic used for your current 9 entries:** `>350 words` → `essay`, otherwise `fragment`. You can retag after.

---

### Bookshelf and reviews — `src/content/books/<slug>.md`

Add the cover under `src/assets/studio/covers/`, then create `src/content/books/my-book.md`:

```md
---
demo: false
title: "Book Title"
author: "Author Name"
cover: "../../assets/studio/covers/my-book.jpg"
yearRead: 2026
rating: 4.5
dateFinished: "2 Sep 2026"
featured: false
excerpt: "One-line preview shown on the shelf overlay."
goodreadsLink: "https://www.goodreads.com/book/show/12345"
---

Write the review here. Leaving the body empty creates an unreviewed book (shows “No review yet.” on the detail page).
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `demo` | No | `boolean` `true` (default) | **Set `demo: false` for every real book.** Demo books are ignored in your current shelf. |
| `title` | **Yes** | `string` | Book title. The overlay auto-shrinks when the title is long (`>32 chars` → smaller font; detail page `>40 chars` → smaller `h1`). Quote titles with `:` or `'`. |
| `author` | **Yes** | `string` | |
| `cover` | **Yes** | `image()` | Path to `assets/studio/covers/*.{jpg,jpeg,png,svg,webp}`. Quote if the path has spaces. |
| `yearRead` | **Yes** | `int` | Year bucket (e.g. `2025`, `2026`). The latest `yearRead` opens by default. |
| `rating` | No | `0`–`5` | Supports halves (e.g. `4.5`). Shown as `4.5 / 5` on the detail page. |
| `dateFinished` | No | `string` | e.g. `"2 Sep 2026"`. Shown in the metadata line. |
| `featured` | No | `boolean` | `true` adds the book to **All time favourites** (left rail, scrolls when >~12). Only `The God of Small Things`, `Beloved`, `Seeing Like a Feminist` are currently `true`. |
| `recommended` | No | `boolean` `false` | Legacy flag (reserved). |
| `excerpt` | No | `string` | One-line preview on the shelf overlay. |
| `goodreadsLink` | No | `string` (`url`) | Per-book Goodreads URL (`https://www.goodreads.com/book/show/<id>`). The shelf footer also links to your profile: `https://www.goodreads.com/user/show/30028606-c-gayathri` (set in `src/data/externalLinks.ts`). |

*The “reviewed” badge appears only when the Markdown body is non-empty. An empty body shows “No review yet.” — no “sample title card” or “review pending” text is inserted.*

**Goodreads import:** Your current 24 books (2025 + 2026) were generated from `assets/studio/goodreads_library_export.numbers` via `numbers-parser`. To add more books, re-export **CSV** from Goodreads (My Books → Import/Export → Export Library) and drop `goodreads_library_export.csv` in `assets/studio/`, or update the `.numbers` file and re-run the import script. Covers are matched by slug: `The God of Small Things` → `god-of-small-things.jpg` — keep filenames kebab-cased.

**Reading challenge:** The progress bar and “/ goal” text come from `src/data/studioConfig.ts`:

```ts
readingChallenge: {
  2026: { goal: 30 },
  2025: { goal: 15 },
}
```

Add a year or change the number, save, and the shelf rail updates. The goal defaults to the book count for that year if no entry exists.

**Favourites scrolling:** When more than ~12 favourites exist, the left-rail “All time favourites” cover strip scrolls (`max-height: 220px; overflow-y: auto`). No extra markup needed.

---

### Studio About, navigation, and links

* **About statement, paragraphs, education, skills, news, influences** — `src/data/studioAbout.ts`.

  * `education` is an array; you already have `IIT Madras` + `Pracheen Kala Kendra` (diploma). Add more as `{ title, place, period }`.
  * `skills` is a string array joined with `·`.
  * `news` is now empty (`[]`). Add `{ date: "Jun 2026", text: "…" }` — no `demo` flag. The “demo entries” label is gone; an empty `news` shows “No news yet.”
  * `influences` — 5 images from `assets/studio/Influences/` (`beloved.jpg`, `god-of-small-things.jpg`, `andy-warhol-marilyn.webp`, `LaColonneBrisee-2_900x.jpg`, `images.jpeg`):
    ```ts
    { file: "beloved.jpg", title: "Beloved — Toni Morrison" }
    ```
    `file` must match the basename in `Influences/`. Add `href: "/studio/projects/…"` optionally to link an influence to a project.

* **Studio name, tagline, labels, hover palette, reading goals** — `src/data/studioConfig.ts`.

* **External links** — `src/data/externalLinks.ts`:
  ```ts
  export const externalLinks = {
    research: "/",
    instagram: "https://www.instagram.com/iamascribble/",
    substack: "https://substack.com/@gayathrineelachandran",
    blog: "https://vanillalamusings.wordpress.com/",
    twitter: "",
    goodreads: "https://www.goodreads.com/user/show/30028606-c-gayathri",
  };
  ```
  Empty values are omitted from the footer and About → Elsewhere list. Adding `goodreads` automatically adds it to both places.

* **Portrait:** The Studio About page uses `src/assets/about.jpg` (3:4, `max-height: min(46dvh, 520px)`). Replace that file directly; the research homepage keeps `src/assets/portrait.png` (they are independent — the research page is untouched per your constraint).

---

## Image placement and paragraph text styles — the full system

### The 12-column grid and Place

MDX project and writing pages render `mdx-body` as a **12-column grid** (`repeat(12, 1fr)`). Every block wraps the internal `Place` primitive:

```astro
import Image from '../../components/studio/blocks/Image.astro';
import Text from '../../components/studio/blocks/Text.astro';
import Gallery from '../../components/studio/blocks/Gallery.astro';
import Quote from '../../components/studio/blocks/Quote.astro';
import ImagePair from '../../components/studio/blocks/ImagePair.astro';

<Image src={myImage} preset="centered" />
```

**Presets → grid placement:**

| Preset | `grid-column` | Use |
|---|---|---|
| `centered` | `3 / span 8` | Default for most images |
| `left` | `1 / span 7` | Flush left |
| `right` | `6 / span 7` | Flush right |
| `offset-left` | `1 / span 6` | Left, slightly inset |
| `offset-right` | `7 / span 6` | Right, slightly inset |
| `narrow` | `4 / span 5` | Narrow, centred |
| `narrow-left` | `1 / span 5` | Narrow, left |
| `large` | `1 / span 12` | Full-bleed of the stage |
| `full-bleed` | `1 / span 12` + `margin-inline: min(-4vw, -48px)` | Bleeds to the viewport edge |

**Precise control — override the preset:**

```mdx
<Image src={img} preset="centered" colStart={2} colSpan={6} offsetY={-12} offsetX={8} />
```

* `colStart` (1–12) + `colSpan` (1–12) place the block explicitly — this is the “more control” you asked for (`centre, right` alone is not enough).
* `offsetY` / `offsetX` nudge the block in pixels (e.g. `offsetY={-20}` lifts it).
* On mobile (`≤820px`) every block collapses to `1 / -1` (full width) — offsets are ignored.

**Resizing images:**

```mdx
<Image src={img} preset="centered" width="72%" />
<Image src={img} preset="narrow" scale={0.9} />
```

* `width` — CSS width inside its grid cell (`"68%"`, `"420px"`, `"85%"`). Defaults to `100%`.
* `scale` — `transform: scale(0.5–1.5)` for fine tuning without reflowing the grid.
* Both can be combined with `colStart`/`colSpan` for exact placement + size.

**Other blocks:**

* `ImagePair` — `left`, `right` (both `ImageMetadata`), `preset: centered|large|left|right`, `caption`.
* `Gallery` — `images: ImageMetadata[]`, `preset`. Renders an irregular masonry (alternating widths 38/27/45/30…% with a 34px stagger on odd items).
* `Quote` / `Text` — see paragraph styles below.

### Paragraph text styles — every option

**Global tokens** (`src/styles/studio.css`): `--s-serif` Cormorant Garamond (500), `--s-mono` Space Mono, `--s-ink`, `--s-grey`, `--s-faint`. Utilities: `.s-serif`, `.s-mono`, `.s-meta` (11px mono, `0.04em`, grey), `.s-link` (12px mono).

| Context | Style | How to get it |
|---|---|---|
| **MDX `Text` block — mono marginalia** | `12.5px` Space Mono, `1.85`, grey, max `62ch` | `<Text preset="narrow-left">…</Text>` (default) |
| **MDX `Text` — serif essay** | `18px` Cormorant, `1.65`, ink | `<Text variant="serif" size="md">…</Text>` |
| **MDX `Text` — note** | `10.5px` mono, `1.7`, faint, italic | `<Text variant="note">…</Text>` |
| **MDX `Text` — meta** | `11px` mono, `0.04em`, grey | `<Text variant="meta">…</Text>` |
| **Size tweaks** | `sm` 0.85×, `md` 1×, `lg` 1.15× | `<Text size="lg" variant="serif">…</Text>` |
| **MDX `Quote`** | `26–38px` serif, `500`, `1.25`, italic | `<Quote preset="offset-right" attribution="— Author">…</Quote>` |
| **MDX raw markdown `p`** | Inherits `Text` context if inside `Text`, otherwise browser default inside `mdx-body` (add a class via `Place` if needed) | `## A claim` → serif heading; `> blockquote` → italic |
| **Writing `pageLayout: essay`** | `19.5px` serif, `1.75` | Set in frontmatter `pageLayout: essay` |
| **Writing `pageLayout: poem`** | `13.5px` mono, `2.0` | `pageLayout: poem` |
| **Writing `pageLayout: fragment`** | `14px` mono, `2.1` | `pageLayout: fragment` (default) |
| **Project `simple` rail** | `note` 12.5px mono grey (summary) | Frontmatter `summary` + `pageType: simple` |
| **Project `simple` `text` variant** | Pull-quote `26–36px` serif italic (`textExcerpt`/`summary`) + `body` 12.5px mono | `previewType: text` |
| **Book detail `review`** | `18px` serif, `1.65`, `55ch` | Markdown body of `books/*.md` |

**Example — composing a project page:**

```mdx
---
title: "My Essay with Images"
year: 2026
clusters: [eyes]
previewType: gallery
hero: "../../assets/studio/clusters/eyes/self portrait.jpg"
gallery:
  - "../../assets/studio/clusters/eyes/self portrait.jpg"
pageType: mdx
size: medium
---

import selfPortrait from '../../assets/studio/clusters/eyes/self portrait.jpg';
import meenakshi from '../../assets/studio/clusters/eyes/Meenakshi/IMG_1168.PNG';

<Text variant="serif" size="lg" preset="narrow-left">
Practice is not a schedule. It is the shape the day leaves behind.
</Text>

<Image src={selfPortrait} preset="offset-right" width="84%" colStart={7} colSpan={5} />
<Quote preset="narrow" attribution="— Virginia Woolf">the pattern was painted until it hummed</Quote>
<Text variant="mono">Four cities under invented weather. Each swirl began as the same photograph…</Text>
<Gallery images={[meenakshi]} preset="large" />
```

Mobile (`≤820px`) collapses every block to full width and strips offsets — no separate mobile markup needed.

---

## Deployment

Pushes to `main` deploy through `.github/workflows/deploy.yml` to `https://c-gayathri.github.io/my-website/`.

`astro.config.mjs` sets `base: '/my-website'`. If the repository name changes, update that value. For a custom domain, also update `site`, change `base` to `'/'`, add the domain configuration, and verify a production preview.

## Further documentation

* `docs/project-vision.md` — scope and design intent.
* `docs/studio-design-system.md` — layout and interaction rules.
* `docs/constellation-geometry.md` — authoritative Constellation geometry.
* `docs/technical-decisions.md` — architectural constraints.
* `HANDOFF.md` — current implementation and validation status.

