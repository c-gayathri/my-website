# Project Vision

This repository holds one person's website in two deliberately distinct parts.

## 1. Research homepage — `/`

A professional academic homepage for professors, researchers, collaborators, and
people arriving from a CV or paper.

- Extremely restrained, typographic, editorial. White/near-white, black text,
  hairline rules. No decoration for its own sake.
- Zero client-side JavaScript. Static HTML/CSS only.
- Single page: hero (portrait, name, intro, links), research projects
  (most important first), education, news, a quiet outside-research line,
  minimal footer.
- On desktop the page fits the first viewport; the projects panel and the
  news list scroll internally. Below ~900px it becomes a normal scrolling
  page.
- The **only** connection to the Studio is a small "Studio ↗" text link in the
  upper-right corner.

## 2. Studio — `/studio`

A much more experimental creative site for art, animation, photography, writing,
and mixed-media projects. Planned structure:

- `/studio` — homepage built around a large spatial / constellation-like
  interface: manually positioned clusters, custom pointer interactions, hover
  previews, drag/pan, optional zoom, motion.
- `/studio/projects/[slug]` — mixed-media project pages; some reusable content
  components, some fully custom implementations (MDX expected).
- `/studio/notepad` — writing area.
- `/studio/bookshelf` — reading list.
- `/studio/photography` — photo work.

**The two visual languages must stay separate.** The Studio is free to be dark,
playful, dense, animated, and interactive; the research page stays quiet and
formal. Architecture enforces this: the research page imports its own stylesheet
(`src/styles/research.css`) and components; the Studio will get its own layout
and styles and must not import research styles. The only shared code is
`BaseLayout.astro`, which is just the HTML shell (head, meta, minimal reset).

## Current status

- [x] Research homepage implemented (`src/pages/index.astro`)
- [x] `/studio` placeholder page so the header link resolves
- [ ] Studio: not designed yet — deliberately out of scope for now

Placeholder content to replace when available: Paper/Code/Slides URLs
(add a `links` array to a project in `src/data/projects.ts`), and the final
wording of the outside-research sentence in `src/data/profile.ts`.
