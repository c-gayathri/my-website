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
| `npm run constellation:update` | Regenerate constellation coverage after adding/removing a cluster (writes `src/data/constellationMeta.json`, fails if any cluster lies outside the star field) |

> Run `npm run check` after every content edit. The authoritative field rules are in `src/content.config.ts` — if a required field is missing or a value is outside its enum, the check will fail with the exact file and line.

### Adding a new cluster

1. Create `src/content/clusters/<new-id>.md` with `title`, `description`, `hoverColor` etc. (see field tables below).
2. Append `"<new-id>"` to `src/data/clusterOrder.ts` (bottom = outer ring). The top 6 in that file are the focus window.
3. If the cluster has projects, add their ids to `src/data/projectOrder.ts[<new-id>]` in display order (first id supplies the default cluster preview; new projects go at the top).
4. Leave `previewImage` out to use that first project's lead image, or set `previewImage: "../../assets/studio/.../cover.jpg"` in the cluster frontmatter to choose a cluster-specific image.
5. Run `npm run constellation:update` — new stars/lines are **generated** across the enlarged cluster region (never stretched); the script verifies every cluster lies inside the star field and reports `extraStars`. Then `npm run check`. The world grows as `max(1.35, sqrt(N/6)*1.25)` so new clusters go to the edge with fresh surrounding constellation. Removing a cluster: delete the `.md` file, drop its id from `clusterOrder.ts`/`projectOrder.ts`, re-run the same two commands.

### Modifying content

- **Cluster text/colour/preview:** edit `src/content/clusters/<id>.md` (`title`, `description`, `hoverDescription`, `hoverColor`). `previewImage` is optional; without it, the first project's lead image is used. Project order is in `src/data/projectOrder.ts`. No script needed — just `npm run check`.
- **Project images/text:** edit `src/content/projects/<slug>.mdx`. `gallery` is the image list; `hero` is optional and can override which image leads previews. If `hero` is omitted, the first gallery image is used in previews. Repeating that image as both `hero` and `gallery[0]` is safe and appears only once. `summary` is a short blurb directly below the project title, separate from image captions. Use `layoutMode: "writing-first"` for a long written piece and put its prose and image blocks in the MDX body; use `image-first` for image-led pages. Gallery images open in a full-size lightbox.
- **Writing:** `image` = first-image fallback for the Writing Pad card, `preview.image` = optional card override, and `gallery[0]` is used when no cover image exists. `gallery` = inline images rendered as full-width blocks below the prose. Place additional `<Image>`/`<Gallery>` blocks directly in the MDX body for mid-text placement. `src/data/writingOrder.ts` is the featured subset and its display order; unlisted pieces follow in descending `date` order. The same order appears on the Writing Pad and the Index. `pageLayout: essay|poem|fragment` controls text style.
- **Photography:** Photography projects are listed only in `/studio/photography/` and retain their individual `/studio/projects/<slug>/` pages. They are intentionally excluded from the constellation, cluster pages, and the general All Projects listing; the Photography page is the gallery entry point, while the individual routes remain canonical destinations. The dedicated gallery is sorted by the ids in `src/data/photographyOrder.ts` first, in that exact order; all remaining photography projects follow by descending `year`, then alphabetical `title`. To feature photographs, add their project slugs to `photographyOrder` in the desired display order. The current example is `['nam', 'lollipops', 'witching-hour']`, so `'nam'` appears first, followed by `'lollipops'` and `'witching-hour'`; move, add, or remove ids to change the featured sequence. The list may be empty, and slugs omitted from it remain in the automatic year/title order.
- **Research links:** GitHub/LinkedIn/Scholar in `src/data/profile.ts` open in a new tab (`target="_blank"` in `Hero.astro`).
- After any content edit: `npm run check` then `npm run build`.

### Adding a new project

1. Put images in `src/assets/studio/clusters/<cluster>/` (or `src/assets/studio/` for shared). Use kebab-case filenames (`my-work.jpg`, not `IMG_1234.JPG`).
2. Create `src/content/projects/<slug>.mdx` with `title`, `year`, `clusters: ["<cluster>"]`, and a `gallery` list (quote paths if they contain spaces). `hero` is optional; when omitted, the first gallery image is used as the preview image. Add `featured: true` (≤5 per cluster) and `featuredImage: "my-work.jpg"` if you want to choose the image used in the constellation collage.
3. Add the slug to the top of `src/data/projectOrder.ts[<cluster>]`. If the project belongs to multiple clusters, add it to each relevant array — the Index “all projects” list will dedup (first cluster wins).
4. Choose `layoutMode: "image-first"` for a lead image or gallery, or `layoutMode: "writing-first"` for a written piece built from prose and MDX blocks (`Image`, `ImagePair`, `Text`, `Quote`). In a writing-first page, import and place images in the body where they should appear.

### For audio

* Self-hosted: `audioSrc: "../../assets/studio/audio/track.mp3"` (store under `public/audio/` or `src/assets` — works on GitHub Pages <100 MB) → renders `<audio controls>`.
* Embed: `audioUrls: ["https://soundcloud.com/..."]` or YouTube `youtubeUrls` for video (both work in either mode).

---

## Routes

| Route | Content |
|---|---|
| `/` | Research profile, projects, education, and news (data in `src/data/`) |
| `/studio/` | Interactive Constellation |
| `/studio/clusters/[slug]/` | Projects belonging to a cluster |
| `/studio/projects/[slug]/` | Individual creative project |
| `/studio/writing/` | Writing pad (index) |
| `/studio/writing/[slug]/` | Individual writing entry |
| `/studio/bookshelf/` | Year-switchable Bookshelf and all-time favourites |
| `/studio/bookshelf/[slug]/` | Individual book/review |
| `/studio/photography/` | Photography gallery, with featured projects followed by year/title ordering |
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
│   │       └── Influences/        # images for the About → Influences grid
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

The constellation currently contains the canonical creative clusters listed in `src/data/clusterOrder.ts`. Photography is maintained as a separate gallery and is deliberately not part of the constellation or the general cluster/project listings. Each top-level folder in `assets/studio/clusters/` maps to one or more project assets.

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
summary: >-
  A short description goes here. It can wrap over several lines in the source
  and will appear below the title, above the project metadata.
previewType: image
hero: "../../assets/studio/clusters/eyes/self portrait.jpg"
pageType: simple
pageLayout: image-dominant
size: medium
relatedWriting: []
---

For an image-led page, put the short accompanying text in `summary`; the body is only rendered with `previewType: text`. For a longer written piece, use `layoutMode: writing-first` and write the content in the body.
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

For a project page that is just a frontmatter gallery (for example `src/content/projects/meenakshi.mdx`), `galleryCaptions` is an optional list in the same order as `gallery`. Leave an empty string at any position to keep that image uncaptioned. `heroCaption` is for a standalone lead image; `galleryCaption` is for one caption below the whole gallery. `galleryColumns: "2"` or `"3"` controls the columns when a gallery contains more than two images; Meenakshi has an explicit `"3"` placeholder, matching its current default.

| Field | Required | Type / Modes | Notes |
|---|---|---|---|
| `title` | **Yes** | `string` | Project title. Quote if it contains `:`. |
| `year` | **Yes** | `int` | Year shown on the project page and used for sorting. |
| `date` | No | `string` | Optional precise date (e.g. `"2025-06-14"`). |
| `clusters` | No | `string[]` | Cluster slugs this project belongs to. Use `[]` if none. One project can belong to multiple clusters (dedup). |
| `types` | No | `string[]` | Free-form, e.g. `["image"]`, `["image","series"]`. Kept as project metadata; the site displays `medium` instead. |
| `medium` | No | `string[]` | e.g. `["watercolour","ink"]`, `["digital","photography"]`. Shown in the left rail. |
| `tags` | No | `string[]` | Free-form. |
| `summary` | No | `string` | Short blurb shown directly below the project title, separate from image captions. Newlines in a summary are rendered as line breaks. For poetry or other multiline text, use a YAML literal block (`summary: |`) so YAML retains those newlines; `summary: >-` folds wrapped source lines into a paragraph. Omit it or leave it as `""` until you have text. |
| `layoutMode` | No | `image-first` (default) / `writing-first` | `image-first` shows the lead artwork/gallery. `writing-first` displays the MDX body as the written piece; add images in that body with imported blocks such as `<Image>` and `<ImagePair>`. |
| `previewType` | No | `image` (default) / `gallery` / `video` / `text` / `media-text` / `custom` | **What the preview card shows:** `image` = `hero`, `gallery` = `hero` + count badge, `video` = `videoSrc` with play overlay, `text` = large italic `textExcerpt`/`summary`, `media-text` = `hero` + `summary` side-by-side, `custom` = requires `customComponent`. |
| `hero` | No | `image()` | Optional preview/lead image path relative to the file. If omitted, the first `gallery` image is used as the preview image. A hero repeated as the first gallery image is de-duplicated in gallery previews. Paths with spaces **must be quoted**. |
| `heroCaption` | No | `string` | Caption for the lead image. Leave `""` as a placeholder to show no caption. |
| `thumbnail` | No | `image()` | Optional smaller preview; falls back to `hero`. |
| `gallery` | No | `image[]` | Project images. The first item can supply the preview image when `hero` is omitted. Shown as a responsive grid on image-first project pages (natural heights retained, click to open lightbox). Quote paths with spaces. |
| `galleryCaptions` | No | `string[]` | Optional per-image captions aligned by index with `gallery`. Use `""` entries as empty placeholders. |
| `galleryCaption` | No | `string` | Optional caption for the gallery as a whole, shown below its images. Leave `""` to keep it hidden. |
| `galleryColumns` | No | `"2"` / `"3"` (`"3"` default) | Columns when there are more than two images. A single image uses the single-image layout; two images appear side by side. |
| `videoSrc` | No | `string` | Path to `.mp4`/`.mov` under `assets/` (e.g. `"../../assets/studio/clusters/eyes/IMG_1272.mp4"`). Use with `previewType: video`. |
| `videoPoster` | No | `image()` | Poster for `videoSrc`. |
| `youtubeUrls` | No | `string[]` (`url`) | One or more YouTube URLs — rendered as embeds. |
| `textExcerpt` | No | `string` | Large italic pull-quote when `previewType: text`. |
| `pageType` | No | `simple` (default) / `mdx` / `custom` | `simple` = left rail + single artwork (fits viewport) + optional `gallery` row. `mdx` = modular editorial page using blocks (see below). `custom` requires `customComponent`. |
| `pageLayout` | No | `image-dominant` (default) / `side-caption` / `offset` | Preset for `simple` pages. Currently hooks as `layout-*` class for future styling — `image-dominant` is the default. |
| `size` | No | `small` / `medium` / `large` / `full-content` (`large` default) | Sizing class for project artwork. `small` constrains a standalone image to about 560px; `large` expands stage images to the available width. For an image inside written content, use the MDX `Image` block's `width` and `preset` instead. |
| `relatedWriting` | No | `string[]` | Writing slugs (filenames without extension) to link under “related writing” in the rail. |
| `clusterPreview` | No | `{x,y,width,align,featured}` | Manual placement inside the cluster page (rare; omit). |
| `mobile` | No | `{order,width,align}` | Mobile ordering hint for cluster-page card. |

**Choosing where text goes:** Use `summary` for a short blurb shown right below the title, not below the image. Image captions are separate and belong on the relevant image block. On image-first pages, the MDX body is only rendered with `previewType: text`; for long prose, use `pageType: mdx`, `layoutMode: writing-first`, and put the writing and any image blocks in the MDX body. For image-first galleries, `galleryColumns: "2"` or `"3"` selects columns when there are more than two images; one image stays full width, two images stay side by side, and a single row remains vertically centered.

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
| `date` | **Yes** | `coercible date` (`YYYY-MM-DD`) | Unlisted pieces sort newest first; pieces in `src/data/writingOrder.ts` use that file's featured order. |
| `type` | No | `poem` / `essay` / `fragment` (default) / `mixed` | Semantic type, shown as a small label if `preview.showType` is true. |
| `excerpt` | No | `string` | Preview excerpt on the index. Leave `""` to omit. |
| `image` | No | `image()` | Lead image above the prose. Relative path, quote if it has spaces. |
| `gallery` | No | `image[]` | Additional images (rendered where you place them, or unused). |
| `relatedProjects` | No | `string[]` | Project slugs to link. |
| `pageLayout` | No | `essay` / `poem` / `fragment` (default) / `mixed` / `custom` | **Text style** (see § Paragraph styles). `essay` = serif 19.5px, `poem`/`fragment` = mono. |
| `preserveBreaks` | No | `boolean` `false` (default) | `true` = single line breaks in the source render as line breaks (for poems). `false` = a single newline is ignored; use a blank line for a new paragraph. |
| `preview.variant` | No | `title-excerpt` / `minimal` / `fragment` / `image-text` | Index card style. `fragment` shows a larger serif excerpt. |
| `preview.showDate` | No | `boolean` `true` | Show the date on the index. |
| `preview.showType` | No | `boolean` `true` | Show the `type` label. |
| `preview.excerptLength` | No | `number` | Truncation hint (reserved). |
| `preview.featured` | No | `boolean` | Legacy field. Use `src/data/writingOrder.ts` to mark and order featured entries. |
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
| `cover` | **Yes** | `image()` or URL | Local cover path, or a large Open Library ISBN URL. Quote URL/path values. |
| `yearRead` | No | `int` | Year bucket (e.g. `2024`, `2025`, `2026`). The latest year opens by default. For undated entries on Others, omit it. |
| `shelf` | No | `year` / `others` (`year` default) | Put older or undated titles under `others`; these stay out of annual reading challenges. |
| `goodreadsShelf` | No | `read` / `to-read` | Preserves Goodreads shelf status for entries shown under Others. |
| `rating` | No | `0`–`5` | Supports halves (e.g. `4.5`). Shown as `4.5 / 5` on the detail page. |
| `dateFinished` | No | `string` | e.g. `"2 Sep 2026"`. Shown in the metadata line. |
| `featured` | No | `boolean` | `true` adds the book to **All time favourites** (left rail, scrolls when >~12). |
| `coverLookup` | No | `boolean` | `true` tries Google Books for a large cover if the selected ISBN or placeholder cover is unavailable. |
| `recommended` | No | `boolean` `false` | Legacy flag (reserved). |
| `excerpt` | No | `string` | One-line preview on the shelf overlay. |
| `goodreadsLink` | No | `string` (`url`) | Per-book Goodreads URL (`https://www.goodreads.com/book/show/<id>`). The shelf footer also links to your profile: `https://www.goodreads.com/user/show/30028606-c-gayathri` (set in `src/data/externalLinks.ts`). |

*The “reviewed” badge appears only when the Markdown body is non-empty. An empty body shows “No review yet.” — no “sample title card” or “review pending” text is inserted.*

**Cover choice:** ISBN-backed entries use the large Open Library cover endpoint (`-L`) and try a title/author lookup in Google Books if that edition has no cover. Entries without an ISBN use the same title/author lookup. Existing local covers can be kept or replaced by changing `cover`.

**All-time favourite order:** Set `featured: true` to include a book in the favourite strip. Reorder favourites by moving their content slugs in `src/data/bookFavouriteOrder.ts` (first entry appears first); featured books missing from that list are appended alphabetically.

**Reading challenge:** The progress bar and “/ goal” text come from `src/data/studioConfig.ts`:

```ts
readingChallenge: {
  2026: { goal: 20 },
  2025: { goal: 12 },
  2024: { goal: 8 },
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

To add captions to images in a written piece, set `caption` on `<Image>`. `<ImagePair>` accepts `captionLeft` and `captionRight` for individual image captions, plus `caption` for the pair as a whole. `<Gallery>` accepts `captions={["", ""]}` for per-image caption placeholders and `caption=""` for a caption below the whole gallery. Empty captions render nothing.

For a written-piece gallery, `columns={2}` (or `1`, `3`, or `4`) switches to that many equal columns. Omit `columns` to keep the current staggered layout. The project gallery uses its frontmatter `galleryColumns: "2"` or `"3"` setting for galleries with more than two images.

On Subliminal, empty `width` and `height` props are left on its `<Image>` and `<ImagePair>` blocks as sizing placeholders. Fill them with CSS values such as `"80%"` or `"480px"` when you want to resize; blank values leave the current layout unchanged.

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

### Basic paragraph formatting (Markdown)

Wherever you write body text — writing entries, `writing-first` project bodies, book reviews, and inside `<Text>` blocks — use plain Markdown. Frontmatter fields (`title`, `description`, `summary`, `excerpt`) are plain text: no formatting there.

| What you want | What you type | Notes |
|---|---|---|
| New paragraph | Leave a **blank line** between paragraphs | A single newline is ignored (unless `preserveBreaks: true`, see below) |
| Line break within a paragraph | End the line with **two spaces** then newline, or use `\` at line end | For poems, easier: set `preserveBreaks: true` in writing frontmatter — every single newline becomes a break |
| *Italic* | `*text*` or `_text_` | |
| **Bold** | `**text**` | |
| `Code` | `` `text` `` | Mono inline snippet |
| Section heading | `## Heading` | Serif heading; use `##`, not `#` (`#` is the page title) |
| Bulleted list | Lines starting with `- ` | Blank line before the list |
| Numbered list | Lines starting with `1. `, `2. ` | Numbers auto-increment |
| Quote | Lines starting with `> ` | Italic block; for a big pull-quote use `<Quote>` instead |
| Link | `[label](https://…)` | Opens in the same tab |
| Divider | `---` on its own line | Horizontal rule |

Example:

```mdx
## A small heading

This is *italic* and this is **bold**. This is `code`.

- first item
- second item

> a quiet quoted line

A poem needs breaks — either set `preserveBreaks: true` up top,
or end each line with two spaces.
```

### Adding blocks in between (images, quotes, text styles)

Inside writing entries and `writing-first` project bodies, drop a block anywhere between paragraphs — it renders exactly where you place it. Every path is **relative to the `.mdx` file**:

```mdx
import detail from '../../assets/studio/writing/Subliminal/IMG_1217.PNG';
import Image from '../../components/studio/blocks/Image.astro';

First paragraph of your text…

<Image src={detail} alt="Subliminal — detail" preset="large" />

Next paragraph…
```

| Block | Import | Key props |
|---|---|---|
| `Image` — one image mid-text | `.../blocks/Image.astro` | `src` (imported image), `alt`, `preset` (default `large` in writing; see grid presets above), `caption`, `width`, `height` |
| `ImagePair` — two images side by side | `.../blocks/ImagePair.astro` | `left`, `right` (imported images), `altLeft`/`altRight`, `captionLeft`/`captionRight`, `caption`, `widthLeft`/`heightLeft`, `widthRight`/`heightRight` |
| `Gallery` — staggered row of 3+ | `.../blocks/Gallery.astro` | `images={[a, b, c]}`, optional `captions={["", "", ""]}`, `caption`, `columns={2}` (1–4) |
| `Quote` — oversized pull-quote | `.../blocks/Quote.astro` | children = quote text, `attribution="— Name"` |
| `Text` — switch paragraph style | `.../blocks/Text.astro` | `variant`: `mono` (default) / `serif` / `note` / `meta`, `size`: `sm` / `md` / `lg` |

Rules of thumb:

- **Prefer blocks over raw `![](...)` Markdown images.** Raw images render unstyled (a CSS guard keeps their aspect safe, but they get no caption, no sizing, no lightbox).
- **One import per image**, placed after the frontmatter. The name is yours (`detail`, `cover`, `step1`…).
- Don't duplicate: `image:` frontmatter is the cover (top), `gallery:` frontmatter renders below the prose — an image placed inline as a block should be removed from `gallery:` so it appears once.
- Presets like `centered`/`left`/`right` refer to the 12-column project grid; in writing pages every block simply spans the reading column.

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
