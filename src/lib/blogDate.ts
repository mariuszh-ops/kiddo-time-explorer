// AN-9-099: `publishedAt` wpisu to data kalendarzowa „RRRR-MM-DD”. `new Date("2026-08-03")`
// czyta ją jako północ UTC, a `toLocaleDateString` bez strefy formatuje w strefie urządzenia,
// więc w Ameryce wpis z 3 sierpnia pokazywał „2 sierpnia 2026”. Formatujemy w UTC — ta sama
// data w każdej strefie. Jeden formater na moduł (wzorzec AF-5-065).
const FORMAT_DATY_WPISU = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** „3 sierpnia 2026” dla "2026-08-03", niezależnie od strefy urządzenia. Nie-data → tekst wejściowy. */
export function formatBlogDate(publishedAt: string): string {
  const data = new Date(publishedAt);
  return Number.isNaN(data.getTime()) ? publishedAt : FORMAT_DATY_WPISU.format(data);
}
