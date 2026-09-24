// ── Studio content collections ───────────────────────────────────────────
// Schemas for the creative side of the site. See docs/content-model.md.
//
// Clusters   — themes shown as constellation nodes (frontmatter only).
// Projects   — canonical creative works; MDX body = modular page content.
// Writing    — "Writing pad" entries (poems, essays, fragments).
// Books      — bookshelf entries; markdown body = the review.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const clusters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/clusters' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    /** Optional cluster collage cover; defaults to the first project image. */
    previewImage: image().optional(),
    hoverDescription: z.string().optional(),
    hoverColor: z.string().optional(),
    /** featured clusters frame the view when the constellation opens */
    featured: z.boolean().default(false),
    /** Existing world-space overrides. Generated anchors are used when absent. */
    desktop: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().default(420),
      driftRadius: z.number().default(10),
      /** parallax weight: nearer clusters drift/drag more (0.6–1.4) */
      depth: z.number().default(1),
    }).optional(),
    /**
     * Optional normalized overrides applied after deterministic generation.
     * x/y are 0..1 anchors; width is a 0..1 fraction of world width.
     */
    generatedThenOverrideable: z.object({
      x: z.number().min(0).max(1).optional(),
      y: z.number().min(0).max(1).optional(),
      width: z.number().min(0.05).max(0.4).optional(),
    }).optional(),
    mobile: z
      .object({
        order: z.number().default(99),
        width: z.string().default('full'),
        align: z.enum(['left', 'center', 'right']).default('left'),
      })
      .default({}),
    /** other cluster ids to draw constellation lines to */
    connections: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int(),
      date: z.string().optional(),
      clusters: z.array(z.string()).default([]),
      types: z.array(z.string()).default([]),
      medium: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      summary: z.string().optional(),
      /** mark ≤5 projects per cluster as featured — those images populate the constellation collage */
      featured: z.boolean().default(false),
      /** filename of the one image in this project to use (e.g. "IMG_1168.PNG"); defaults to hero/thumbnail/gallery[0] */
      featuredImage: z.string().optional(),
      /** gallery layout on the project page: 3-col grid (default) */
      galleryLayout: z.enum(['grid', 'scattered']).default('grid'),
      /** gallery columns when >2 images: '2' or '3' (default '3'). 1 image → full width, 2 → two columns. */
      galleryColumns: z.enum(['2', '3']).default('3'),
      /** explicit layout mode — do not infer from content */
      layoutMode: z.enum(['image-first', 'writing-first']).default('image-first'),
      /** Render source line breaks in poem-like MDX body text. */
      preserveBreaks: z.boolean().default(false),
      /** image-first sizing */
      size: z.enum(['small', 'medium', 'large', 'full-content']).default('large'),
      fit: z.enum(['contain', 'cover']).default('contain'),
      previewType: z
        .enum(['image', 'gallery', 'video', 'text', 'media-text', 'custom'])
        .default('image'),
      hero: image().optional(),
      /** Optional caption for the lead image; omitted or empty leaves the page unchanged. */
      heroCaption: z.string().optional(),
      thumbnail: image().optional(),
      gallery: z.array(image()).default([]),
      /** Optional captions aligned by index with gallery; empty strings are placeholders. */
      galleryCaptions: z.array(z.string()).optional(),
      /** Optional caption for the gallery as a whole. */
      galleryCaption: z.string().optional(),
      videoSrc: z.string().optional(),
      videoPoster: image().optional(),
      youtubeUrls: z.array(z.string().url()).default([]),
      audioSrc: z.string().optional(),
      audioUrls: z.array(z.string().url()).default([]),
      textExcerpt: z.string().optional(),
      /** how the individual page is built */
      pageType: z.enum(['simple', 'mdx', 'custom']).default('simple'),
      /** simple-page preset */
      pageLayout: z.enum(['image-dominant', 'side-caption', 'offset']).default('image-dominant'),
      customComponent: z.string().optional(),
      relatedWriting: z.array(z.string()).default([]),
      /** manual placement inside the cluster page (optional override) */
      clusterPreview: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          align: z.enum(['left', 'center', 'right']).optional(),
          featured: z.boolean().optional(),
        })
        .optional(),
      mobile: z
        .object({
          order: z.number(),
          width: z.string().optional(),
          align: z.string().optional(),
        })
        .optional(),
    })
    .refine((p) => p.pageType !== 'custom' || p.customComponent, {
      message: 'pageType "custom" requires customComponent',
    }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
  schema: ({ image }) => z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    type: z.enum(['poem', 'essay', 'fragment', 'mixed']).default('fragment'),
    excerpt: z.string().optional(),
    image: image().optional(),
    gallery: z.array(image()).default([]),
    relatedProjects: z.array(z.string()).default([]),
    pageLayout: z.enum(['essay', 'poem', 'fragment', 'mixed', 'custom']).default('fragment'),
    preserveBreaks: z.boolean().default(false),
    preview: z
      .object({
        variant: z.enum(['title-excerpt', 'minimal', 'fragment', 'image-text']).optional(),
        image: image().optional(),
        desktop: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            align: z.enum(['left', 'center', 'right']).optional(),
          })
          .optional(),
        mobile: z
          .object({ order: z.number(), width: z.string().optional() })
          .optional(),
        excerptLength: z.number().optional(),
        showDate: z.boolean().default(true),
        showType: z.boolean().default(true),
        featured: z.boolean().optional(),
      })
      .optional(),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: ({ image }) => z.object({
    /** Books in this collection are sample content until replaced by the owner. */
    demo: z.boolean().default(true),
    title: z.string(),
    author: z.string(),
    /** A local cover or a large public cover URL. */
    cover: z.union([image(), z.string().url()]),
    /** Others shelf entries may not have a recorded finish year. */
    yearRead: z.number().int().optional(),
    shelf: z.enum(['year', 'others']).default('year'),
    goodreadsShelf: z.enum(['read', 'to-read']).optional(),
    /** If the selected cover is unavailable, look it up by title and author. */
    coverLookup: z.boolean().default(false),
    rating: z.number().min(0).max(5).optional(),
    dateFinished: z.string().optional(),
    featured: z.boolean().optional(),
    recommended: z.boolean().default(false),
    excerpt: z.string().optional(),
    goodreadsLink: z.string().optional(),
  }),
});

export const collections = { clusters, projects, writing, books };
