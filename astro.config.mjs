// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// ── GitHub Pages settings ────────────────────────────────────────────────
// The site deploys as a *project site*: https://c-gayathri.github.io/my-website
// `base` must match the repository name. All internal links use
// import.meta.env.BASE_URL (see src/layouts/BaseLayout.astro).
//
// If you later point a custom domain at the site: set `site` to the domain
// and change `base` to '/'.
export default defineConfig({
  site: 'https://c-gayathri.github.io',
  base: '/my-website',
  output: 'static',
  integrations: [react(), mdx()],
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});
