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
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
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
      /** explicit layout mode — do not infer from content */
      layoutMode: z.enum(['image-first', 'writing-first']).default('image-first'),
      /** image-first sizing */
      size: z.enum(['small', 'medium', 'large', 'full-content']).default('large'),
      fit: z.enum(['contain', 'cover']).default('contain'),
      previewType: z
        .enum(['image', 'gallery', 'video', 'text', 'media-text', 'custom'])
        .default('image'),
      hero: image().optional(),
      thumbnail: image().optional(),
      gallery: z.array(image()).default([]),
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
    cover: image(),
    yearRead: z.number().int(),
    rating: z.number().min(0).max(5).optional(),
    dateFinished: z.string().optional(),
    featured: z.boolean().optional(),
    recommended: z.boolean().default(false),
    excerpt: z.string().optional(),
    goodreadsLink: z.string().optional(),
  }),
});

export const collections = { clusters, projects, writing, books };
