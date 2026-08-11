/**
 * Zamiana godzin otwarcia na schema.org OpeningHoursSpecification.
 * Obsługiwane formaty wejściowe (te same dane, które renderuje sekcja
 * „Godziny otwarcia"):
 *   - PL: "poniedziałek: 09:00–17:00|wtorek: …"
 *   - EN (Google Places): "Monday: 10:00 AM – 8:00 PM | Tuesday: Closed"
 * Wyjście zawsze w 24-godzinnym formacie HH:MM.
 */
const DAY_MAP: Record<string, string> = {
  poniedziałek: "Monday",
  poniedzialek: "Monday",
  wtorek: "Tuesday",
  środa: "Wednesday",
  sroda: "Wednesday",
  czwartek: "Thursday",
  piątek: "Friday",
  piatek: "Friday",
  sobota: "Saturday",
  niedziela: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** "8:00 PM" | "9" | "09:30" → "20:00" | "09:00" | "09:30" */
const toTime24 = (raw: string): string | undefined => {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const suffix = m[3]?.toUpperCase();
  if (suffix === "PM" && h < 12) h += 12;
  if (suffix === "AM" && h === 12) h = 0;
  if (h > 24) return undefined;
  return `${String(h).padStart(2, "0")}:${min}`;
};

export interface OpeningHoursSpec {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens?: string;
  closes?: string;
}

export function buildOpeningHoursSpecification(hours?: string | null): OpeningHoursSpec[] {
  if (!hours) return [];
  const entries = hours.replace(/\r\n|\r|\n/g, "|").split("|");
  const out: OpeningHoursSpec[] = [];

  for (const raw of entries) {
    const entry = raw.trim();
    if (!entry) continue;
    const idx = entry.indexOf(":");
    if (idx === -1) continue;
    const dayKey = entry.slice(0, idx).trim().toLowerCase();
    const dayOfWeek = DAY_MAP[dayKey];
    if (!dayOfWeek) continue;
    const time = entry.slice(idx + 1).trim();
    // Zamknięte / brak godzin → dzień pomijamy (Google traktuje brak wpisu jako zamknięte).
    if (!time || /zamk|closed/i.test(time)) continue;
    if (/24\s*h|całodobow|open 24/i.test(time)) {
      out.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens: "00:00", closes: "23:59" });
      continue;
    }
    const match = time.match(
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:[–—-]|do)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/,
    );
    if (!match) continue;
    const opens = toTime24(match[1]);
    const closes = toTime24(match[2]);
    if (!opens || !closes) continue;
    out.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes });
  }

  return out;
}
