/**
 * Sitemap Generator
 * Run: node scripts/generate-sitemap.js
 * Generates dist/sitemap.xml from activities, categories, blog posts, and static pages.
 *
 * Uses dynamic import + tsx to load TypeScript source files.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Note: env shim is handled in src/config/env.ts itself

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_URL = 'https://familyfun.pl';

// Zewnętrzny (tylko-do-odczytu) projekt Supabase z katalogiem atrakcji.
// Ten sam anon key co w src/lib/catalogClient.ts.
const CATALOG_URL = 'https://zpqpgatnnbojgiejmtpt.supabase.co';
const CATALOG_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXBnYXRubmJvamdpZWptdHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTY2OTIsImV4cCI6MjA5MzE5MjY5Mn0.nHm-KdlT1r2VlXQRfXqRDCCisU4KEf9yPI96kIpx4tc';

async function fetchAllActivities() {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    // Ten sam warunek publikacji co front (useActivities/useActivitiesInfinite):
    // published=true oraz karta nieukryta przez admina.
    const url =
      `${CATALOG_URL}/rest/v1/public_activities` +
      `?select=slug,updated_at,region,type&published=eq.true` +
      `&or=(admin_hidden.is.null,admin_hidden.eq.false)` +
      `&order=slug.asc&limit=${PAGE}&offset=${from}`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        apikey: CATALOG_ANON_KEY,
        authorization: `Bearer ${CATALOG_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const chunk = await res.json();
    if (!chunk.length) break;
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return all;
}

// We'll read the TS files via a simple approach: use the compiled dist or
// parse them directly. Since this runs post-build, we import from src using tsx.
// For simplicity, we duplicate the minimal data extraction logic here.

async function main() {
  const genDate = new Date().toISOString().slice(0, 10);

  // Dynamic imports of TS source files (requires tsx or ts-node)
  let activities, categoryConfigs, FEATURES, blogPosts, REGION_SLUGS;

  try {
    // Pełny katalog czytamy wprost z Supabase (public_activities, anon SELECT).
    // Wcześniej ładowany z public/data/activities.json — plik został usunięty.
    activities = await fetchAllActivities();

    // pathToFileURL — ESM loader wymaga URL-i file:// (bez tego pada na Windows)
    const catMod = await import(pathToFileURL(resolve(ROOT, 'src/data/categoryPages.ts')).href);
    categoryConfigs = catMod.categoryConfigs;

    const regionMod = await import(pathToFileURL(resolve(ROOT, 'src/data/regions.ts')).href);
    REGION_SLUGS = regionMod.REGION_SLUGS;

    const flagMod = await import(pathToFileURL(resolve(ROOT, 'src/lib/featureFlags.ts')).href);
    FEATURES = flagMod.FEATURES;

    const blogMod = await import(pathToFileURL(resolve(ROOT, 'src/data/blogPosts.ts')).href);
    blogPosts = blogMod.blogPosts;
  } catch (e) {
    console.error('Failed to build sitemap:', e.message);
    process.exit(1);
  }

  const urls = [];

  // 1. Home
  urls.push({ loc: '/', changefreq: 'daily', priority: '1.0' });

  // 2. Strony regionów i kategorii — URL-e MUSZĄ być identyczne z canonical
  //    deklarowanym przez CategoryPage.tsx:
  //      /{region}, /{region}/{kategoria}, /kategoria/{kategoria}
  const categorySlugs = categoryConfigs.map((c) => c.slug).filter(Boolean);

  // AN-15-023 / AN-10-014: lista z 0 kart (np. /opolskie/centra-rozrywki) to
  // „thin content" — nie zglaszamy jej (strona sama dostaje "noindex, follow").
  // Liczymy karty z tego samego zbioru co lista (region + type, published,
  // nieukryte). Pusty katalog = blad odczytu, nie brak atrakcji: wtedy listy
  // zostaja jak dawniej, zeby jedna zla odpowiedz nie wyciela wszystkich stron.
  const kartyListy = new Map();
  const dolicz = (loc) => kartyListy.set(loc, (kartyListy.get(loc) || 0) + 1);
  for (const a of activities) {
    if (a.region) dolicz(`/${a.region}`);
    if (a.type) dolicz(`/kategoria/${a.type}`);
    if (a.region && a.type) dolicz(`/${a.region}/${a.type}`);
  }
  const pominietePuste = [];
  const pushListing = (u) => {
    if (activities.length > 0 && !kartyListy.get(u.loc)) {
      pominietePuste.push(u.loc);
      return;
    }
    urls.push(u);
  };

  for (const region of REGION_SLUGS) {
    pushListing({ loc: `/${region}`, changefreq: 'weekly', priority: '0.9' });
    for (const cat of categorySlugs) {
      pushListing({ loc: `/${region}/${cat}`, changefreq: 'weekly', priority: '0.8' });
    }
  }

  // Kategorie w skali całej Polski
  for (const cat of categorySlugs) {
    pushListing({ loc: `/kategoria/${cat}`, changefreq: 'weekly', priority: '0.8' });
  }
  if (activities.length === 0) {
    console.warn('⚠️ Katalog pusty — listy regionów i kategorii bez sprawdzania liczby kart.');
  } else if (pominietePuste.length) {
    console.log(`ℹ️ Pominięte puste listy (0 kart): ${pominietePuste.join(', ')}`);
  }

  // 2b. Strony indeksu (HTML sitemap) — linki wewnętrzne do każdej karty
  urls.push({ loc: '/indeks', changefreq: 'weekly', priority: '0.5' });
  for (const region of REGION_SLUGS) {
    urls.push({ loc: `/indeks/${region}`, changefreq: 'weekly', priority: '0.5' });
  }


  // 3. Activity detail pages — jeden wpis na atrakcję z katalogu
  for (const a of activities) {
    if (!a.slug) continue;
    urls.push({
      loc: `/atrakcje/${a.slug}`,
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: a.updated_at ? a.updated_at.slice(0, 10) : genDate,
    });
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
    <lastmod>${u.lastmod || genDate}</lastmod>
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

// 13.10.2026: rebuild sitemap after hiding 126 attractions (prebuild regenerates it on every Publish).
