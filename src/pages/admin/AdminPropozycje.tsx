import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  X,
} from "lucide-react";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { filterOptions } from "@/data/activities";
import { REGIONS } from "@/data/regions";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Status = "nowe" | "w-toku" | "zalatwione" | "odrzucone";

// Kolumny tabeli activity_submissions (projekt zpqp). Wiersze wstawia
// SubmitActivityModal — formularz „Dodaj atrakcję" ze stopki i z profilu.
interface Submission {
  id: string;
  created_at: string;
  status: string;
  name: string;
  region: string | null;
  address: string | null;
  city: string | null;
  type: string | null;
  age_min: number | null;
  age_max: number | null;
  is_indoor: boolean | null;
  price_level: number | null;
  description: string | null;
  website: string | null;
  amenities: string[] | null;
  contact_email: string | null;
}

const TABS: { id: Status; label: string }[] = [
  { id: "nowe", label: "Nowe" },
  { id: "w-toku", label: "W toku" },
  { id: "zalatwione", label: "Załatwione" },
  { id: "odrzucone", label: "Odrzucone" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  filterOptions.type.map((t) => [t.value, t.label]),
);

const REGION_LABELS: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.slug, r.label]),
);

// Poziomy cenowe — te same cztery opcje co w formularzu zgłoszenia.
const PRICE_LABELS: Record<number, string> = {
  0: "Bezpłatne",
  1: "Niedrogie ($)",
  2: "Umiarkowane ($$)",
  3: "Drogie ($$$)",
};

// Udogodnienia — identyfikatory zgodne z SubmitActivityModal.
const AMENITY_LABELS: Record<string, string> = {
  stroller: "Dostępne dla wózków",
  parking: "Parking",
  "changing-table": "Przewijalnia",
  "food-onsite": "Jedzenie na miejscu",
  playground: "Plac zabaw",
  toilets: "Toalety",
  fenced: "Ogrodzone / bezpieczne",
  accessible: "Dostępne dla niepełnosprawnych",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const fmtAge = (min: number | null, max: number | null) => {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} lat`;
  return min != null ? `od ${min} lat` : `do ${max} lat`;
};

const AdminPropozycje = () => {
  const [sp, setSp] = useSearchParams();
  const status = (sp.get("s") as Status) || "nowe";
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);

  const [rows, setRows] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Status, number | null>>({
    "nowe": null,
    "w-toku": null,
    "zalatwione": null,
    "odrzucone": null,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setStatus = (s: Status) => {
    const next = new URLSearchParams(sp);
    next.set("s", s);
    next.delete("p");
    setSp(next, { replace: true });
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(sp);
    if (p <= 1) next.delete("p");
    else next.set("p", String(p));
    setSp(next, { replace: true });
  };

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      TABS.map(async (t) => {
        const { count, error } = await supabase
          .from("activity_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", t.id);
        return [t.id, error ? null : count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(results) as Record<Status, number | null>);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("activity_submissions")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      toast.error("Nie udało się pobrać propozycji", { description: error.message });
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Submission[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [status, page]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const setSubmissionStatus = async (r: Submission, newStatus: Status) => {
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    setTotal((t) => Math.max(0, t - 1));
    const { error } = await supabase
      .from("activity_submissions")
      .update({ status: newStatus })
      .eq("id", r.id);
    if (error) {
      toast.error("Nie udało się zapisać", { description: error.message });
      setRows((prev) => [r, ...prev]);
      setTotal((t) => t + 1);
      return;
    }
    toast.success(`Propozycja → ${TABS.find((t) => t.id === newStatus)?.label ?? newStatus}`);
    loadCounts();
  };

  const nowLoading = loading && rows.length === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Propozycje z formularza „Dodaj atrakcję". Nie trafiają na żadną skrzynkę —
        ta zakładka jest jedynym miejscem, w którym ktokolwiek je zobaczy.
      </p>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => {
          const isActive = t.id === status;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setStatus(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm border transition-colors",
                isActive
                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                  : "bg-background border-border hover:bg-muted",
              )}
            >
              {t.label}
              <span className={cn("ml-2 text-xs tabular-nums", isActive ? "text-primary/80" : "text-muted-foreground")}>
                {count == null ? "…" : count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
          <span>{nowLoading ? "Ładowanie…" : `${total} ${total === 1 ? "propozycja" : "propozycji"}`}</span>
          <span>Strona {page} / {totalPages}</span>
        </div>

        {rows.length === 0 && !loading && (
          <div className="py-16 text-center text-muted-foreground">Brak propozycji w tej kolejce</div>
        )}

        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const wiek = fmtAge(r.age_min, r.age_max);
            const miasto = r.city ? REGION_LABELS[r.city] ?? r.city : null;
            const amenities = r.amenities ?? [];
            return (
              <li key={r.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-medium">{r.name}</h3>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.type && <Badge variant="secondary">{TYPE_LABELS[r.type] ?? r.type}</Badge>}
                  {miasto && <Badge variant="secondary">{miasto}</Badge>}
                  {wiek && <Badge variant="secondary">{wiek}</Badge>}
                  {r.is_indoor != null && (
                    <Badge variant="secondary">{r.is_indoor ? "Pod dachem" : "Na zewnątrz"}</Badge>
                  )}
                  {r.price_level != null && (
                    <Badge variant="secondary">
                      {PRICE_LABELS[r.price_level] ?? `Poziom cenowy ${r.price_level}`}
                    </Badge>
                  )}
                </div>

                {r.description && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.description}</p>
                )}

                {r.address && (
                  <div className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {r.address}
                  </div>
                )}

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((a) => (
                      <span
                        key={a}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {AMENITY_LABELS[a] ?? a}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="text-primary hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {r.website}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {r.contact_email && (
                    <a
                      href={`mailto:${r.contact_email}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      {r.contact_email}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {status !== "w-toku" && (
                    <Button size="sm" variant="outline" className="tap44" onClick={() => setSubmissionStatus(r, "w-toku")}>
                      W toku
                    </Button>
                  )}
                  {status !== "zalatwione" && (
                    <Button size="sm" variant="outline" className="tap44" onClick={() => setSubmissionStatus(r, "zalatwione")}>
                      <Check className="w-4 h-4 mr-1" /> Załatwione
                    </Button>
                  )}
                  {status !== "odrzucone" && (
                    <Button size="sm" variant="outline" className="tap44" onClick={() => setSubmissionStatus(r, "odrzucone")}>
                      <X className="w-4 h-4 mr-1" /> Odrzuć
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-4 py-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {total > 0
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} z ${total}`
              : ""}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="tap44" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="tap44" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPropozycje;
