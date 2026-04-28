#!/usr/bin/env node
/**
 * Slug duplicate report — pełny przegląd slugów w
 * src/data/fallbackActivities.json. W odróżnieniu od `validate-slugs.js`
 * ten skrypt NIE failuje (exit 0 niezależnie od wyniku) — służy do
 * szybkiego ręcznego przeglądu.
 *
 * Użycie:
 *   npm run report:slugs                # tylko konsola
 *   npm run report:slugs -- --out=raport-slugow.txt   # + plik
 *
 * Domyślnie, gdy znajdą się duplikaty, raport jest też zapisywany do
 * /tmp/slug-report.txt dla wygodnego podglądu.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../src/data/fallbackActivities.json");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// --- parse args ---
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--out="));
const explicitOut = outArg ? outArg.slice("--out=".length) : null;

// --- load ---
/** @type {Array<{id:number,title?:string,slug?:string,city?:string}>} */
const activities = JSON.parse(readFileSync(DATA_PATH, "utf8"));

const seen = new Map(); // slug -> [{id,title,city}]
const missing = []; // {id,title}
const malformed = []; // {id,title,slug}

for (const a of activities) {
  const entry = { id: a.id, title: a.title ?? "(brak tytułu)", city: a.city ?? "" };
  const slug = a.slug;

  if (typeof slug !== "string" || slug.length === 0) {
    missing.push(entry);
    continue;
  }
  if (!SLUG_RE.test(slug)) {
    malformed.push({ ...entry, slug });
  }
  if (!seen.has(slug)) seen.set(slug, []);
  seen.get(slug).push(entry);
}

const duplicates = [...seen.entries()]
  .filter(([, items]) => items.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

// --- build report ---
const lines = [];
const now = new Date().toISOString();
lines.push("================================================================");
lines.push(" RAPORT SLUGÓW — src/data/fallbackActivities.json");
lines.push(` Wygenerowano: ${now}`);
lines.push("================================================================");
lines.push("");
lines.push(`Łącznie atrakcji:        ${activities.length}`);
lines.push(`Unikalnych slugów:       ${seen.size}`);
lines.push(`Brak slug:               ${missing.length}`);
lines.push(`Niepoprawny format:      ${malformed.length}`);
lines.push(`Zduplikowanych slugów:   ${duplicates.length}`);
lines.push("");

if (missing.length > 0) {
  lines.push("--- BRAK SLUG --------------------------------------------------");
  for (const m of missing) {
    lines.push(`  • id=${m.id}  city="${m.city}"  title="${m.title}"`);
  }
  lines.push("");
}

if (malformed.length > 0) {
  lines.push("--- NIEPOPRAWNY FORMAT (oczekiwany kebab-case [a-z0-9-]) -------");
  for (const m of malformed) {
    lines.push(`  • id=${m.id}  slug="${m.slug}"  title="${m.title}"`);
  }
  lines.push("");
}

if (duplicates.length > 0) {
  lines.push("--- DUPLIKATY SLUGÓW -------------------------------------------");
  for (const [slug, items] of duplicates) {
    lines.push(`\n  ✖ "${slug}"  (×${items.length})`);
    for (const it of items) {
      lines.push(`      - id=${it.id}  city="${it.city}"  title="${it.title}"`);
    }
  }
  lines.push("");
} else {
  lines.push("✓ Brak zduplikowanych slugów.");
  lines.push("");
}

const report = lines.join("\n");

// --- output ---
console.log(report);

const shouldWriteFile = explicitOut !== null || duplicates.length > 0 || missing.length > 0 || malformed.length > 0;
if (shouldWriteFile) {
  const outPath = explicitOut
    ? resolve(process.cwd(), explicitOut)
    : "/tmp/slug-report.txt";
  try {
    mkdirSync(dirname(outPath), { recursive: true });
  } catch {
    /* ignore */
  }
  writeFileSync(outPath, report, "utf8");
  console.log(`\n[report-slugs] Raport zapisany do: ${outPath}`);
}

// Zawsze exit 0 — to jest tylko raport, nie walidacja.
process.exit(0);