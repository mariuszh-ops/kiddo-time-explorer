/**
 * Sitemap Generator
 * Run: node scripts/generate-sitemap.js
 * Generates dist/sitemap.xml from activities, categories, blog posts, and static pages.
 *
 * Uses dynamic import + tsx to load TypeScript source files.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Note: env shim is handled in src/config/env.ts itself

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_URL = 'https://familyfun.pl';

// We'll read the TS files via a simple approach: use the compiled dist or
// parse them directly. Since this runs post-build, we import from src using tsx.
// For simplicity, we duplicate the minimal data extraction logic here.

async function main() {
  // Dynamic imports of TS source files (requires tsx or ts-node)
  let activities, categoryConfigs, FEATURES, blogPosts;

  try {
    // Pełny katalog wprost z JSON — getActivities() w Node zwracał tylko fallback,
    // przez co sitemap pomijał podstrony atrakcji.
    activities = JSON.parse(readFileSync(resolve(ROOT, 'public/data/activities.json'), 'utf-8'));

    // pathToFileURL — ESM loader wymaga URL-i file:// (bez tego pada na Windows)
    const catMod = await import(pathToFileURL(resolve(ROOT, 'src/data/categoryPages.ts')).href);
    categoryConfigs = catMod.categoryConfigs;

    const flagMod = await import(pathToFileURL(resolve(ROOT, 'src/lib/featureFlags.ts')).href);
    FEATURES = flagMod.FEATURES;

    const blogMod = await import(pathToFileURL(resolve(ROOT, 'src/data/blogPosts.ts')).href);
    blogPosts = blogMod.blogPosts;
  } catch (e) {
    console.error('Failed to import source files. Make sure tsx is available:', e.message);
    process.exit(1);
  }

  const urls = [];

  // 1. Home
  urls.push({ loc: '/', changefreq: 'daily', priority: '1.0' });

  // 2. Category landing pages (city × category)
  const enabledCities = FEATURES.ENABLED_CITIES || ['warszawa'];
  for (const city of enabledCities) {
    for (const cat of categoryConfigs) {
      const path = cat.slug ? `/atrakcje/${city}/${cat.slug}` : `/atrakcje/${city}`;
      const priority = cat.slug ? '0.8' : '0.9';
      urls.push({ loc: path, changefreq: 'weekly', priority });
    }
  }

  // 3. Activity detail pages
  const filteredActivities = (FEATURES.EVENTS ? activities : activities.filter(a => !a.isEvent)) || [];
  for (const a of filteredActivities) {
    urls.push({ loc: `/atrakcje/${a.slug}`, changefreq: 'monthly', priority: '0.7' });
  }

  // 4. Blog
  if (FEATURES.BLOG) {
    urls.push({ loc: '/inspiracje', changefreq: 'weekly', priority: '0.6' });
    for (const post of blogPosts) {
      urls.push({ loc: `/inspiracje/${post.slug}`, changefreq: 'monthly', priority: '0.5' });
    }
  }

  // 5. Static pages
  const staticPages = [
    { loc: '/regulamin', changefreq: 'yearly', priority: '0.2' },
    { loc: '/polityka-prywatnosci', changefreq: 'yearly', priority: '0.2' },
    { loc: '/kontakt', changefreq: 'yearly', priority: '0.3' },
    { loc: '/o-nas', changefreq: 'yearly', priority: '0.3' },
  ];
  urls.push(...staticPages);

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write to public/ so Vite serves it in dev and copies to dist/ on build
  const publicDir = resolve(ROOT, 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  writeFileSync(resolve(publicDir, 'sitemap.xml'), xml, 'utf-8');
  console.log(`✅ Sitemap generated with ${urls.length} URLs → public/sitemap.xml`);
}

main();
