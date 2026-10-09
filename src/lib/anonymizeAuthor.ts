/**
 * Podpis autora opinii na froncie: „Jan Kowalski” → „Jan K.”.
 *
 * Domknięcie 09.10 (DK-4-044, P3): autor zapisany JEDNYM wyrazem („JanKowalski”,
 * „jan.kowalski”, „jan_kowalski”) omijał anonimizację — split po spacjach dawał
 * jeden człon i nazwisko szło na stronę w całości (19 opinii Google w bazie).
 * Pojedynczy wyraz dzielimy więc dodatkowo po kropce, podkreślniku, myślniku
 * i po przejściu mała → WIELKA litera (klasy Unicode, więc działa z ogonkami
 * i cyrylicą). Ta sama reguła co `_rozbij_autora` w publikuj_do_public.py.
 * Wiele wyrazów — bez zmian: pierwszy + inicjał ostatniego.
 */

const SEPARATORY = /[._-]+/;
const MALA_WIELKA = /(?<=\p{Ll})(?=\p{Lu})/u;

function rozbijAutora(name: string): string[] {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== 1) return tokens;
  const czlony = tokens[0]
    .split(SEPARATORY)
    .flatMap((kawalek) => kawalek.split(MALA_WIELKA))
    // człon bez litery („Jan_123”) nie jest nazwiskiem — nie robimy z niego inicjału „1.”
    .filter((c) => /\p{L}/u.test(c));
  // same separatory („...”), nic do podziału albo jeden człon z literami → zostaw oryginalny wyraz
  return czlony.length >= 2 ? czlony : tokens;
}

export function anonymizeAuthor(name: string): string {
  const parts = rozbijAutora(name ?? "");
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
