# Website maintenance guide

This site is a static Astro website with two sections: the research site at `/` and the creative Studio at `/studio/`. This guide documents where content lives, the controls available in content files and data files, and where to adjust layout code.

## Start and validate

```bash
npm install       # first setup only
npm run dev       # local server, usually http://localhost:4321/my-website/
npm run check     # validate Astro, TypeScript, and content schemas
npm run build     # generate the static site in dist/
npm run preview   # serve the generated build locally
```

After editing content, run `npm run check` and `npm run build`. `src/content.config.ts` is the source of truth for content fields and allowed values. Image paths in Markdown/MDX frontmatter are relative to the content file; quote paths containing spaces.

## Find things

| What you want to edit | Where it lives |
|---|---|
| Research profile, education, news, and research projects | `src/data/profile.ts`, `education.ts`, `news.ts`, `projects.ts` |
| Studio cluster descriptions and constellation overrides | `src/content/clusters/<slug>.md` |
| Studio project pages and project summaries | `src/content/projects/<slug>.mdx` |
| Writing Pad entries | `src/content/writing/<slug>.mdx` |
| Books, shelf status, and reviews | `src/content/books/<slug>.md` |
| Constellation/index cluster order | `src/data/clusterOrder.ts` |
| Project order within clusters | `src/data/projectOrder.ts` |
| Featured writing order | `src/data/writingOrder.ts` |
| Photography order | `src/data/photographyOrder.ts` |
| All-time favourite book order | `src/data/bookFavouriteOrder.ts` |
| Shared Studio name, labels, palette, constellation, and reading goals | `src/data/studioConfig.ts` |
| About page content and links | `src/data/studioAbout.ts`, `src/data/externalLinks.ts` |
| Artwork and book covers | `src/assets/studio/` |
| Reusable MDX image/text blocks | `src/components/studio/blocks/` |
| Shared Studio layout, footer, and style tokens | `src/layouts/StudioLayout.astro`, `src/styles/studio.css` |
| Route-specific page layouts | `src/pages/studio/` |
| Constellation geometry and drawing | `src/lib/studio/`, `src/components/studio/Constellation.tsx`, `ConstellationMobile.tsx` |

Content filenames become slugs and URLs. Use lowercase kebab-case filenames, such as `my-project.mdx`. Project and writing images usually live under `src/assets/studio/clusters/` or `src/assets/studio/writing/`; covers live under `src/assets/studio/covers/`.

## Ordering content

### Clusters and projects

`src/data/clusterOrder.ts` is the canonical cluster order for the Constellation and Index. Move a slug to reorder it; append new slugs at the end. A cluster slug is the filename without `.md`.

`src/data/projectOrder.ts` controls the project order on each cluster page. Add each project slug under every cluster it belongs to. This order also determines which works feed the Constellation collage for that cluster (up to five eligible/featured project images). The All Projects index walks clusters in `clusterOrder` and lists each project once, using its first occurrence.

`src/data/photographyOrder.ts` controls the featured sequence in the Photography gallery. Other visible photography projects follow automatically by year/title. `src/data/hiddenPhotographyProjects.ts` hides selected photography entries without deleting their content files.

### Writing

`src/data/writingOrder.ts` is an optional featured list: entries there appear first and in that exact order, with the Featured label. All other entries follow by descending `date`. Put zero, some, or all writing slugs in this file to control the featured subset.

### Books

Set `featured: true` in book frontmatter to include it in All-time favourites. Reorder those entries in `src/data/bookFavouriteOrder.ts`. Annual goals are in `src/data/studioConfig.ts` under `readingChallenge`.

## Create and edit a cluster

Create `src/content/clusters/<slug>.md`:

```yaml
---
title: "My Cluster"
description: "Short description shown on the cluster page."
subtitle: "Optional second line"
hoverDescription: "Optional text shown in the Constellation info panel."
hoverColor: "#2438ff"
featured: false
mobile:
  order: 10
  width: full
  align: left
connections: [another-cluster]
---
```

Cluster files are frontmatter-only. `title` and `description` are required. Available fields:

| Field | Type/default | Purpose |
|---|---|---|
| `title`, `description` | required strings | Display name and cluster-page summary |
| `subtitle`, `hoverDescription`, `hoverColor` | optional strings | Secondary title, Constellation text, and hover colour |
| `previewImage` | optional local image | Explicit cluster-page card/collage cover; without it the page uses the first project's image |
| `featured` | boolean, `false` | Gives this node a place in the initial Constellation focus view |
| `desktop` | optional `{x,y,width,driftRadius,depth}` | Absolute world-space position and motion/parallax settings |
| `generatedThenOverrideable` | optional `{x,y,width}` | Normalized generated-position override (`x`,`y` 0–1; `width` 0.05–0.4) |
| `mobile` | `{order,width,align}`, defaults `{99,"full","left"}` | Order and alignment hints for mobile cluster display |
| `connections` | string array, default `[]` | Slugs of clusters joined by constellation lines |

For manual stars/cluster positions, use `generatedThenOverrideable` for small normalized adjustments or `desktop` when you need world coordinates. Keep connections pointed at existing cluster filenames.

## Create and edit a project

Create `src/content/projects/<slug>.mdx`:

```mdx
---
title: "My Project"
year: 2026
clusters: [color-pop]
medium: [watercolour]
summary: |
  A short caption-like summary goes below the title.
  Line breaks are preserved.
previewType: image
hero: "../../assets/studio/clusters/color-pop/my-image.jpg"
gallery: []
layoutMode: image-first
pageType: simple
size: large
---
```

### Project fields

| Field | Type/default | Purpose |
|---|---|---|
| `title`, `year` | required string, integer | Title and year |
| `date` | optional string | More precise date metadata |
| `clusters`, `types`, `medium`, `tags` | string arrays, default `[]` | Related clusters and descriptive metadata. The page displays `medium`. |
| `summary` | optional string | Text below the title, separate from image captions. Use YAML `|` for preserved newlines. |
| `featured` | boolean, `false` | Marks project eligible for Constellation collage inclusion (limit five per cluster) |
| `featuredImage` | optional filename | Image chosen for that collage; otherwise hero/thumbnail/first gallery image is used |
| `previewType` | `image` / `gallery` / `video` / `text` / `media-text` / `custom`, default `image` | Preview-card mode |
| `hero`, `thumbnail` | optional image | Lead artwork or smaller card image; omitted lead uses first gallery image |
| `heroCaption` | optional string | Caption for lead image |
| `gallery` | image array, default `[]` | Additional project images; clicking a gallery image opens it larger |
| `galleryCaptions` | optional string array | Captions aligned by index with `gallery`; empty string leaves a caption blank |
| `galleryCaption` | optional string | Caption below the entire gallery |
| `galleryLayout` | `grid` / `scattered`, default `grid` | Gallery visual arrangement |
| `galleryColumns` | `"2"` / `"3"`, default `"3"` | Columns for larger galleries; one image is full width and two share a row |
| `videoSrc`, `videoPoster` | optional string, image | Local video file and poster image |
| `youtubeUrls` | URL array, default `[]` | YouTube embeds. Shorts/regular-video aspect is detected automatically. Videos attempt autoplay with sound and loop; browser autoplay rules may require interaction. |
| `youtubeAspectRatios` | positive number array, default `[]` | Optional per-URL aspect overrides in the same order (e.g. `1.78`) |
| `audioSrc`, `audioUrls` | optional string, string array | Local audio source or external audio URLs |
| `textExcerpt` | optional string | Text used for text-style preview cards |
| `layoutMode` | `image-first` / `writing-first`, default `image-first` | Artwork-first page or written piece with MDX blocks |
| `pageType` | `simple` / `mdx` / `custom`, default `simple` | Page renderer; `custom` requires `customComponent` |
| `pageLayout` | `image-dominant` / `side-caption` / `offset`, default `image-dominant` | Simple page layout preset |
| `size` | `small` / `medium` / `large` / `full-content`, default `large` | Artwork sizing |
| `fit` | `contain` / `cover`, default `contain` | Image fit behavior |
| `whiteBackground` | boolean, `true` | Put transparent artwork on a white background |
| `preserveBreaks` | boolean, `false` | Keep source line breaks in poem-like MDX body text |
| `viewportFitImage` | boolean, `false` | Constrain lead artwork to a typical viewport height |
| `singleImageWidthPx` | optional positive integer | Explicit width for one low-resolution image |
| `collageMode` | `grid` / `masonry` / `custom`, default `grid` | Project-page gallery/preview composition mode |
| `masonryColumns` | optional nonnegative integer array | Explicit column assignment for masonry items in order |
| `collageWidthPercent` | integer 1–100, default `100` | Overall collage width |
| `collageColumns` | optional integer 1–6 | Explicit collage/masonry column count |
| `collageColumnRatios`, `collageRowRatios` | optional positive-number arrays | Relative track sizes for custom layouts |
| `collageTiles` | array, default `[]` | Custom tile descriptors: `name`, `type`, optional `imageIndex`, `videoSrc` or `youtubeUrl`, required `row` and `column`, optional `rowSpan`/`columnSpan` (both default 1) |
| `textExcerpt` | optional string | Pull quote/preview text for a text-led project |
| `customComponent` | optional string | Component key required when `pageType: custom` |
| `relatedWriting`, `relatedProjects` | string arrays, default `[]` | Writing and project slugs linked from this page |
| `clusterPreview` | optional `{x,y,width,align,featured}` | Manual position/feature override for the cluster-page card |
| `mobile` | optional `{order,width,align}` | Mobile card-order and layout hints |

For a few lines beneath the title, use `summary`; it is plain text with line-break support, not Markdown. Image captions are separate: use `heroCaption`, `galleryCaptions`, or `galleryCaption`. Use `layoutMode: writing-first` for a long written piece and place its text and images in the MDX body.

## Create and edit a Writing Pad piece

Create `src/content/writing/<slug>.mdx`:

```mdx
---
title: "A small poem"
date: 2026-09-27
type: poem
excerpt: "Optional index preview."
pageLayout: poem
preserveBreaks: true
preview:
  showDate: true
  showType: true
---

Write the piece here. Use **bold**, *italics*, headings, links, and other Markdown in the body.
```

| Field | Type/default | Purpose |
|---|---|---|
| `title` | optional string | Display title |
| `date` | required date | Sort date for non-featured writing (newest first) |
| `type` | `poem` / `essay` / `fragment` / `mixed`, default `fragment` | Entry label/type |
| `excerpt` | optional string | Index preview excerpt |
| `image` | optional image | Lead image |
| `gallery` | image array, default `[]` | Additional available images |
| `relatedProjects` | string array, default `[]` | Related project slugs |
| `pageLayout` | `essay` / `poem` / `fragment` / `mixed` / `custom`, default `fragment` | Text presentation |
| `preserveBreaks` | boolean, `false` | Preserve single line breaks in the written body |
| `preview` | optional object | Index card controls: `variant`, `image`, `desktop`, `mobile`, `excerptLength`, `showDate`, `showType`, `featured` |
| `preview.variant` | `title-excerpt` / `minimal` / `fragment` / `image-text` | Card style |
| `preview.desktop` | optional `{x,y,width,align}` | Desktop card placement hints |
| `preview.mobile` | optional `{order,width}` | Mobile order/width hints |
| `preview.showDate`, `preview.showType` | booleans, `true` | Show date and entry type |
| `preview.featured` | optional boolean | Legacy field; use `writingOrder.ts` to feature/order entries |

### Markdown and emphasis

Markdown formatting applies to MDX body content (writing pieces, writing-first project bodies, book reviews, and text inside the `Text` block):

- `**bold**` becomes **bold**.
- `*italic*` or `_italic_` becomes *italic*.
- A blank line starts a new paragraph. For poems, set `preserveBreaks: true` to keep every line break.
- Use `[label](https://example.com)` for a link, `## Heading` for a section heading, and `> quote` for a block quote.

Frontmatter `summary`, `excerpt`, `description`, and titles are plain text; Markdown markers there are not interpreted. A project `summary` accepts newlines (`summary: |`) and those line breaks display as written.

## Add images and blocks inside a written piece

Import images and blocks after frontmatter. Paths in imports are relative to the MDX file.

```mdx
import detail from '../../assets/studio/writing/my-piece/detail.jpg';
import Image from '../../components/studio/blocks/Image.astro';
import Text from '../../components/studio/blocks/Text.astro';

The opening paragraph.

<Image src={detail} alt="Description" preset="centered" caption="Optional caption" width="80%" />

<Text variant="serif" size="md">A longer note with **bold** and *italic* Markdown.</Text>
```

| Block | Useful props |
|---|---|
| `Image` | `src`, `alt`, `preset`, `colStart`, `colSpan`, `offsetX`, `offsetY`, `width`, `height`, `scale`, `caption` |
| `ImagePair` | `left`, `right`, `altLeft`, `altRight`, `preset`, `widthLeft`, `widthRight`, `heightLeft`, `heightRight`, `captionLeft`, `captionRight`, `caption` |
| `Gallery` | `images`, `alts`, `captions`, `caption`, `columns` (1–4), `preset`; omit `columns` to use the staggered layout |
| `Text` | `variant` (`mono`, `serif`, `note`, `meta`), `size` (`sm`, `md`, `lg`) |
| `Quote` | Markdown body and optional `attribution`, `preset` |

`Image` presets include `centered`, `left`, `right`, `offset-left`, `offset-right`, `narrow`, `narrow-left`, `large`, and `full-bleed`. On mobile, blocks become full width. For finer sizing, use `width`, `height`, or `scale`.

## Constellation controls

`src/data/studioConfig.ts` holds `layoutSeed`, world size, zoom limits, ambient drift, automatic placement settings, and the hover-colour palette. Change `layoutSeed` to try a different deterministic star/cluster arrangement. Run:

```bash
npm run constellation:update
```

This recalculates constellation coverage metadata in `src/data/constellationMeta.json` and reports whether the star field still covers every cluster. Run `npm run check` and `npm run build` afterwards. The first six slugs in `clusterOrder.ts` form the central focus group; later clusters occupy outer rings. Per-cluster `desktop` and `generatedThenOverrideable` frontmatter can override generated cluster anchors.

The Constellation's decorative stars and line pattern are generated deterministically from its seed in `src/components/studio/Constellation.tsx` and `src/lib/studio/constellationPrimitives.ts`. Cluster collage images come from project order and project `featured`/`featuredImage` settings; `previewImage` on a cluster selects its explicit cover for the cluster listing.

## Books, About, and shared settings

### Books

Each `src/content/books/<slug>.md` file has frontmatter such as:

```yaml
---
demo: false
title: "Book title"
author: "Author"
cover: "../../assets/studio/covers/book.jpg"
yearRead: 2026
shelf: year
rating: 4.5
featured: false
---
```

`title`, `author`, and `cover` are required. Other schema fields include `yearRead`, `shelf` (`year`/`others`), `goodreadsShelf` (`read`/`to-read`), `coverLookup`, `rating` (0–5), `dateFinished`, `featured`, `recommended`, `excerpt`, and `goodreadsLink`. The Markdown body is the review. Goodreads exports or other private working data do not belong in the Git repository.

### About and settings

`src/data/studioAbout.ts` contains the Studio About page content. `src/data/externalLinks.ts` contains shared external links. `src/data/studioConfig.ts` contains display name, labels, palette, reading challenge goals, and Constellation controls. Research site data is kept separately in `src/data/` files such as `profile.ts`, `projects.ts`, `education.ts`, and `news.ts`.

## Adjust page layout and sizing

- Shared fonts, colours, spacing tokens, and global Studio components: `src/styles/studio.css` and `src/layouts/StudioLayout.astro`.
- Individual route grids and responsive breakpoints: the relevant file under `src/pages/studio/` (for example `clusters/[slug].astro`, `projects/[slug].astro`, `photography/index.astro`).
- Project-page image/gallery presentation: project schema fields in `src/content.config.ts`, rendering in `src/pages/studio/projects/[slug].astro`, reusable MDX block props in `src/components/studio/blocks/`.
- Constellation and its small-screen version: `src/components/studio/Constellation.tsx`, `ConstellationMobile.tsx`, and `src/styles/constellation.css`.

Prefer changing a content field when the setting is project-specific; change route CSS or shared styles for a global presentation change.
