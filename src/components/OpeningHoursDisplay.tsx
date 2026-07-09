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

const OpeningHoursDisplay = ({ hours }: OpeningHoursDisplayProps) => {
  // Akceptujemy zarówno "poniedziałek: 9-17|wtorek: ..." jak i format
  // wielolinijkowy (nowe linie z Supabase / Google Places).
  const normalized = hours.replace(/\r\n|\r|\n/g, "|");
  if (!normalized.includes("|")) {
    return <p className="text-sm text-foreground whitespace-pre-line">{hours}</p>;
  }

  const todayIndex = new Date().getDay(); // 0=Sun
  const todayKey = DAY_ORDER[todayIndex];

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
              {time || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OpeningHoursDisplay;
