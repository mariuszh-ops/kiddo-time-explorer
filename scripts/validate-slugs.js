#!/usr/bin/env node
/**
 * Build-time validation: ensures every activity in
 * src/data/fallbackActivities.json has a unique, well-formed slug.
 *
 * Exits with code 1 (failing the build) if duplicates or missing
 * slugs are detected.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../src/data/fallbackActivities.json");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @type {Array<Record<string, unknown>>} */
const activities = JSON.parse(readFileSync(DATA_PATH, "utf8"));

const errors = [];
const seen = new Map(); // slug -> [ {id, title} ]

for (const a of activities) {
  const id = a.id;
  const title = a.title ?? "(brak tytułu)";
  const slug = a.slug;

  if (typeof slug !== "string" || slug.length === 0) {
    errors.push(`✖ Brak slug — id=${id}, title="${title}"`);
    continue;
  }
  if (!SLUG_RE.test(slug)) {
    errors.push(`✖ Niepoprawny format slug "${slug}" — id=${id}, title="${title}"`);
  }
  if (!seen.has(slug)) seen.set(slug, []);
  seen.get(slug).push({ id, title });
}

const duplicates = [...seen.entries()].filter(([, items]) => items.length > 1);

if (duplicates.length > 0) {
  errors.push(`\n✖ Wykryto ${duplicates.length} zduplikowanych slugów:`);
  for (const [slug, items] of duplicates) {
    errors.push(`  • "${slug}" używany przez:`);
    for (const it of items) {
      errors.push(`      - id=${it.id}, title="${it.title}"`);
    }
  }
}

if (errors.length > 0) {
  console.error("\n[validate-slugs] Walidacja slugów NIE PRZESZŁA:\n");
  console.error(errors.join("\n"));
  console.error(
    "\nNapraw plik src/data/fallbackActivities.json (każdy slug musi być unikalny i w formacie kebab-case).\n"
  );
  process.exit(1);
}

console.log(
  `[validate-slugs] OK — ${activities.length} atrakcji, ${seen.size} unikalnych slugów.`
);