/**
 * Zamiana godzin otwarcia (format "poniedziałek: 09:00–17:00|wtorek: …"
 * lub wielolinijkowy) na schema.org OpeningHoursSpecification.
 */
const DAY_MAP: Record<string, string> = {
  poniedziałek: "Monday",
  wtorek: "Tuesday",
  środa: "Wednesday",
  czwartek: "Thursday",
  piątek: "Friday",
  sobota: "Saturday",
  niedziela: "Sunday",
};

const pad = (t: string): string => {
  const [h, m = "00"] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
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
    const dayPl = entry.slice(0, idx).trim().toLowerCase();
    const dayOfWeek = DAY_MAP[dayPl];
    if (!dayOfWeek) continue;
    const time = entry.slice(idx + 1).trim();
    if (!time || /zamk/i.test(time)) {
      out.push({ "@type": "OpeningHoursSpecification", dayOfWeek });
      continue;
    }
    if (/ca[łl]/i.test(time) || /24/.test(time.replace(/[:\s]/g, "")) === false) {
      // pass through to range parsing below
    }
    const match = time.match(/(\d{1,2}(?::\d{2})?)\s*[–—-]\s*(\d{1,2}(?::\d{2})?)/);
    if (match) {
      out.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: pad(match[1]),
        closes: pad(match[2]),
      });
    }
  }

  return out;
}