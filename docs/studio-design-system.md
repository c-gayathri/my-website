# Studio Design System

The art direction rules for `/studio`. Future sessions must respect these —
do not casually redesign them.

## Two worlds, two languages

- Research homepage (`/`): restrained, academic, zero JS. Never import
  `studio.css` there, and never import `research.css` in the Studio.
- Studio (`/studio`): editorial, experimental, monochrome interface; colour
  enters only through artwork and the cluster hover.

## Typography

- `--s-serif` = Cormorant Garamond — large names, titles, quotes.
- `--s-mono` = Space Mono — metadata, navigation, annotations, dates.
- The tension between very large serif and tiny mono annotations carries the
  personality. No decorative colour, no gradients, no rounded cards.

## Constellation

- The homepage IS the constellation. No separate landing page.
- Clusters (themes), not projects, are the major nodes.
- Cluster positions are **authored** in `src/content/clusters/*.md`
  (`desktop.x/y/width/driftRadius/depth`). Nothing random on refresh.
- Cluster images: **centre masonry** — no overlap, gaps, seeded asymmetry.
- Marks are **nodes**: every star/dot drifts constantly on its own two sines;
  lines join drifted node positions with breaks/joints (hand-drawn feel).
  No arcs, no lattices, no orbital rings.
- Cursor: marks near the cursor are **pushed in the direction of cursor
  movement** (proximity-weighted, capped) and relax slowly back.
- Hover: camera zooms to the cluster; other clusters fully removed; whole
  field turns white; violent pointillist twinkle (spawn/despawn) + line
  shimmer; info block anchored beside the cluster; header text turns white;
  colour = seeded **blob splotch** growing from the cluster (<1s) and
  withdrawing on exit.
- Title plates: bg-coloured rectangles with the cluster name — visible at
  rest and in map view, hidden on hover.
- Controls (right edge): **focus** = authored framing; **map** = whole world
  with all titles; margin dust fades at the edges in map mode.
- Debug: `/studio/?hover=<cluster-id>` and `/studio/?view=map`.

## Cluster pages

One-screen asymmetric grid of heterogeneous cards (projects **and** related
writing), big serif cluster title, bordered cards, generous whitespace.

## Project pages

Three levels: `simple` (left meta rail + viewport-fitting artwork),
`mdx` (blocks on a grid: Image, ImagePair, Gallery, Quote, Text — presets:
centered/left/right/offset-left/offset-right/narrow/large), `custom`
(`customComponent` registry — not yet needed; add to
`src/components/studio/custom/` when first used).
Artwork fits the viewport unless `size: full`. Avoid page scroll by default.

## Writing pad

Spatial scatter on desktop (3 columns, shared/staggered height bands,
`layoutSeed` shuffles), ordered stack on mobile. Entries may carry images.
Decorative marks are fixed-pixel SVGs positioned by percentage — never
stretched through a scaled viewBox.

## Bookshelf

Annual challenge + covers grid + featured book + review pages
(`/studio/bookshelf/[slug]`). No "currently reading".

## Colour palette (hover)

`#ff2e88 #2438ff #ff3d1f #00b34a #7a2bff #ff7a00` — chosen so white type
stays readable. Per-cluster override via `hoverColor`.

## Known trade-offs

- `layout` is a **reserved frontmatter key** in Astro MDX — use `pageLayout`.
- CSS files must use `/* */` comments (`//` swallows following rules).
- In flex-column parents, `.s-page` needs explicit `width: 100%` or it
  shrink-to-fits when children are absolutely positioned.
