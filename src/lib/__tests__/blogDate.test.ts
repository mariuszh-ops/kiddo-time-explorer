import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatBlogDate } from "@/lib/blogDate";

// AN-9-099: data wpisu bloga ma być ta sama w każdej strefie urządzenia.
// Vitest (pool forks) uruchamia plik w osobnym procesie, a Node przelicza strefę
// po przypisaniu process.env.TZ — zmiana nie wycieka do innych plików testów.
describe("formatBlogDate (AN-9-099)", () => {
  const tzPrzed = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (tzPrzed === undefined) delete process.env.TZ;
    else process.env.TZ = tzPrzed;
  });

  it("strefa urządzenia jest naprawdę za UTC (inaczej test nic nie dowodzi)", () => {
    const stary = new Date("2026-08-03").toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
    expect(stary).toBe("2 sierpnia 2026");
  });

  it("w America/New_York pokazuje datę z publishedAt, nie dzień wcześniej", () => {
    expect(formatBlogDate("2026-08-03")).toBe("3 sierpnia 2026");
    expect(formatBlogDate("2026-01-01")).toBe("1 stycznia 2026");
  });

  it("nie-data wraca bez zmian zamiast wyjątku", () => {
    expect(formatBlogDate("brak")).toBe("brak");
  });
});
