import { describe, expect, it } from "vitest";
import { buildOpeningHoursSpecification } from "@/lib/openingHoursSchema";

const spec = (dayOfWeek: string, opens: string, closes: string) => ({
  "@type": "OpeningHoursSpecification" as const,
  dayOfWeek,
  opens,
  closes,
});

describe("buildOpeningHoursSpecification — przerwa w ciagu dnia (V-E-02)", () => {
  it("kryterium odbioru: dzien z przerwa daje DWA wpisy", () => {
    const out = buildOpeningHoursSpecification("poniedzialek: 10:00–14:00, 16:00–20:00");
    expect(out).toEqual([spec("Monday", "10:00", "14:00"), spec("Monday", "16:00", "20:00")]);
  });

  it("realny rekord sala-zabaw-magiczna-kraina-jastrzebie-zdroj", () => {
    const out = buildOpeningHoursSpecification(
      "poniedziałek: 13:00–17:00 | wtorek: 10:00–19:00 | środa: 13:00–16:00, 18:00–19:00 | " +
        "czwartek: Zamknięte | piątek: 10:00–16:00 | sobota: Zamknięte | niedziela: 10:00–14:00, 16:30–19:00",
    );
    expect(out).toEqual([
      spec("Monday", "13:00", "17:00"),
      spec("Tuesday", "10:00", "19:00"),
      spec("Wednesday", "13:00", "16:00"),
      spec("Wednesday", "18:00", "19:00"),
      spec("Friday", "10:00", "16:00"),
      spec("Sunday", "10:00", "14:00"),
      spec("Sunday", "16:30", "19:00"),
    ]);
  });

  it("realny rekord plac-marsz-jozefa-pilsudskiego-fontanna-gliwice — szesc zakresow w dniu", () => {
    const out = buildOpeningHoursSpecification(
      "poniedziałek: 09:00–10:00, 10:30–11:30, 12:00–15:00, 16:00–17:00, 18:00–20:00, 20:30–22:00",
    );
    expect(out).toHaveLength(6);
    expect(out[0]).toEqual(spec("Monday", "09:00", "10:00"));
    expect(out[5]).toEqual(spec("Monday", "20:30", "22:00"));
  });

  it("kontrola V-E-04: dzien zamkniety nadal pomijany", () => {
    const out = buildOpeningHoursSpecification(
      "poniedziałek: 10:00–14:00, 16:00–20:00 | wtorek: Zamknięte | środa: Closed | czwartek: ",
    );
    expect(out.map((s) => s.dayOfWeek)).toEqual(["Monday", "Monday"]);
  });

  it("kontrola: format EN i calodobowy bez zmian", () => {
    expect(buildOpeningHoursSpecification("Monday: 10:00 AM – 8:00 PM | Tuesday: Closed")).toEqual([
      spec("Monday", "10:00", "20:00"),
    ]);
    expect(buildOpeningHoursSpecification("sobota: całodobowo")).toEqual([
      spec("Saturday", "00:00", "23:59"),
    ]);
  });

  it("kontrola: dwa wywolania z rzedu daja ten sam wynik (regex /g nie trzyma lastIndex)", () => {
    const wej = "poniedziałek: 10:00–14:00, 16:00–20:00";
    expect(buildOpeningHoursSpecification(wej)).toEqual(buildOpeningHoursSpecification(wej));
  });
});
