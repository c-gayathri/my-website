# HANDOFF — Gayathri's personal website (research + studio)

Read docs/project-vision.md, docs/technical-decisions.md and
docs/studio-design-system.md first — they record the durable decisions.
This file is the current-state snapshot for the next model/session.

## Stack and deployment

Astro 5 + TypeScript static site. GitHub Pages project site:
repo c-gayathri/my-website, base '/my-website' in astro.config.mjs.
CI: .github/workflows/deploy.yml (withastro/action@v3 ->
actions/deploy-pages@v4). Live: https://c-gayathri.github.io/my-website/
Every push to main deploys automatically.

## Architecture

Two deliberately separate worlds share only src/layouts/BaseLayout.astro
(document shell: head/meta/reset — nothing visual):

1. / — professional research homepage. Minimal, zero client JS, styles
   src/styles/research.css, content in src/data/*.ts.
   DO NOT redesign it — the user considers it finished.
2. /studio — experimental creative world (current work area):
   - content collections: src/content/{clusters,projects,writing,books}
   - config: src/data/{studioConfig,externalLinks,studioAbout}.ts
   - styles: src/styles/studio.css
   - layout: src/layouts/StudioLayout.astro
   - React island: src/components/studio/Constellation.tsx
   - MDX blocks: src/components/studio/blocks/ (Image, ImagePair, Gallery,
     Quote, Text; presets via Place.astro on a 12-column grid)

Routes under /studio: index (constellation homepage), clusters/[slug],
projects/[slug], writing + writing/[slug], bookshelf + bookshelf/[slug],
index (directory), index/clusters, index/projects, and about. Nav labels live
in StudioNav.astro; each section heading lives in the page body.

## What is working (local only; authoritative reference commit ca3f8a7)

- The research homepage remains untouched.
- The constellation uses the authoritative 220-285-mark generated geometry
  from `src/lib/studio/constellationPrimitives.ts`. Production and the math
  lab share the same component vocabulary, endpoint-star rules, dispersed
  swarms, glints and local variants.
- Nine collage anchors are deterministic and collision-aware by default;
  normalized frontmatter overrides can replace generated x/y/width values.
  Collages use compact, non-overlapping seeded masonry with project-aware
  source deduplication.
- Desktop focus frames five featured collages at readable scale; map mode
  retains the full world. Mobile focus opens on one readable featured
  collage and permits a lower map zoom for the narrow viewport.
- Existing camera, drift, cursor push, dwell/cooldown, hover zoom, splotch,
  twinkle and reduced-motion behavior is preserved. Touch uses first tap to
  reveal/activate and second tap to navigate.
- Studio navigation consistently shows the name, tagline and route links in a
  fixed header. The name is display-sized only on the Constellation and compact
  elsewhere; content-page titles share one scale. The borderless footer is
  fixed at every viewport width with content clearance and includes the
  copyright on the Constellation. During cluster hover, its background and the
  Focus/Map strip inherit the active cluster colour.
- Cluster pages use compact responsive masonry with two to three equal-width
  cards, bounded media and related writing. Decorative stars are reserved for
  the Constellation homepage.
- Project pages use a bounded meta-rail/stage composition and support local
  video, image, gallery, modular MDX, and optional responsive privacy-mode
  YouTube embeds through `youtubeUrls`.
- Writing uses a stable three-column desktop grid, two columns on tablet and
  one on mobile. Detail pages retain essay/poem/fragment layouts without
  decorative constellation fragments.
- Bookshelf shows one year at a time with hash-addressable year controls, one
  challenge rail, a `featured`-driven All time favourites section, and
  viewport-fit three-row horizontal shelves. Cover motion,
  hover/focus/touch metadata and reviewed tags remain.
- Index is a responsive representative directory with previews and complete
  cluster/project listing routes. About uses a simple copy-left/portrait-right
  composition and a divider-free lower band; it is viewport-fit on desktop
  with internally scrollable News, Elsewhere links and expandable influences.

## Known issues / validation

- `npm run check` has zero errors and five hints from unused declarations in
  the preserved `constellation-math-lab` reference files.
- `npm test` in `constellation-math-lab` passes all 10 tests.
- `npm run build` generates 80 pages; `git diff --check` passes.
- Browser validation used system Chrome at 1440x1000, 1024x768 and 390x844.
  Tested routes had no horizontal overflow, console errors, or page errors;
  the footer remained fixed. iPhone emulation confirmed constellation and
  bookshelf first-tap reveal/second-tap navigation.
- Index search remains intentionally unbuilt; the requested Index is a
  representative directory with dedicated complete listings.
- YouTube schema/rendering is implemented but no sample project currently
  supplies a `youtubeUrls` value.

## Key decisions (do not casually reverse)

- Research homepage stays untouched; separate styles per world; only
  BaseLayout is shared.
- `layout` is a RESERVED Astro MDX frontmatter key — use `pageLayout`.
- CSS files must use /* */ comments only (// swallows following rules).
- In flex-column parents, .s-page needs explicit width: 100%.
- All positions/placements are authored or seeded (layoutSeed) — never
  random on refresh. Manual frontmatter overrides always win.
- Hover colour palette (white-text-safe): #ff2e88 #2438ff #ff3d1f #00b34a
  #7a2bff #ff7a00; strict monochrome at rest.
- Cluster spacing rule (kept by the 3-3-3 lattice): min pairwise centre
  distance ≈700 world units so hover collages (~1/6 screen, H capped 0.78)
  never touch neighbour collages at visible zoom levels (S ≥ mapBelow).
- Hover interactions are driven by the per-frame bbox state machine in the
  rAF loop (Constellation.tsx), NOT by DOM pointer events on the anchors.
  Dwell timers: enter 150 ms, exit 220 ms, cooldown 1500 ms.
- The hover zoom anchors the collage to the pointer position (clamped to
  keep the collage on-screen) rather than centring the viewport.
- Constellation styles live in src/styles/constellation.css (imported by
  /studio only); chrome styles stay in StudioLayout/StudioNav.
- Portrait is auto-detected via import.meta.glob on
  src/assets/portrait.{png,jpg,...}; sample images live in
  src/assets/studio/sample/ (raw *.MOV/*.MP4 sources are gitignored;
  compressed copies in public/studio/videos/).

## Next concrete steps

1. USER REVIEW: compare the local Studio against the supplied visual
   references and approve or request final visual adjustments.
2. Do not push until the user explicitly approves deployment; every push to
   main deploys the site.
3. Replace demo books, News entries and sample project text with final
   content by editing `src/content/*` and `src/data/studioAbout.ts`.
4. Add `youtubeUrls` to a project when a real embed is available.
