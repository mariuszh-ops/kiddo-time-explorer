interface OpeningHoursDisplayProps {
  hours: string;
}

const DAY_ABBREV: Record<string, string> = {
  poniedziałek: "Pon",
  wtorek: "Wt",
  środa: "Śr",
  czwartek: "Czw",
  piątek: "Pt",
  sobota: "Sob",
  niedziela: "Ndz",
};

const DAY_ORDER = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

const EN_TO_PL_DAY: Record<string, string> = {
  sunday: "niedziela",
  monday: "poniedziałek",
  tuesday: "wtorek",
  wednesday: "środa",
  thursday: "czwartek",
  friday: "piątek",
  saturday: "sobota",
};

// Godziny otwarcia dotyczą obiektu w Polsce, więc „dziś” liczymy w strefie
// Europe/Warsaw, a nie w strefie urządzenia (audyt 1000: V-E-01, V-E-10 —
// z Los Angeles w poniedziałek 20:00 pogrubiony był poniedziałek, choć w Polsce
// trwał już wtorek).
const getTodayKey = (): string => {
  try {
    const enDay = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Europe/Warsaw",
    })
      .format(new Date())
      .toLowerCase();
    return EN_TO_PL_DAY[enDay] ?? DAY_ORDER[new Date().getDay()];
  } catch {
    // Brak obsługi strefy w silniku — wracamy do dnia urządzenia.
    return DAY_ORDER[new Date().getDay()];
  }
};

// W danych bywa „Zamknięte” z wielkiej litery (9 wierszy na 20 kartach,
// audyt 400: BA-H-06) — w środku zdania piszemy małą, niezależnie od źródła.
const CLOSED_LABEL = "zamknięte";

const OpeningHoursDisplay = ({ hours }: OpeningHoursDisplayProps) => {
  // Akceptujemy zarówno "poniedziałek: 9-17|wtorek: ..." jak i format
  // wielolinijkowy (nowe linie z Supabase / Google Places).
  const normalized = hours.replace(/\r\n|\r|\n/g, "|");
  if (!normalized.includes("|")) {
    return <p className="text-sm text-foreground whitespace-pre-line">{hours}</p>;
  }

  const todayKey = getTodayKey();

  const entries = normalized.split("|").map((e) => e.trim()).filter(Boolean).map((entry) => {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) return { day: entry.trim(), time: "" };
    const day = entry.slice(0, colonIdx).trim().toLowerCase();
    const time = entry.slice(colonIdx + 1).trim();
    return { day, time };
  });

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
      {entries.map(({ day, time }, i) => {
        const isToday = day === todayKey;
        const isClosed = time.toLowerCase() === "zamknięte" || time === "";
        return (
          <div key={i} className={`col-span-2 grid grid-cols-subgrid py-1 ${i < entries.length - 1 ? "border-b border-border/30" : ""}`}>
            <span className={isToday ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {DAY_ABBREV[day] || day}
            </span>
            <span className={isToday ? "font-semibold text-foreground" : isClosed ? "font-medium text-[#b91c1c]" : "text-muted-foreground"}>
              {time ? (isClosed ? CLOSED_LABEL : time) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OpeningHoursDisplay;
