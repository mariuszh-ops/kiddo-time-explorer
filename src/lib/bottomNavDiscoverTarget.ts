/**
 * Dokąd prowadzi „Odkrywaj” w dolnej nawigacji (telefon).
 *
 * „Odkrywaj” to reset jak logo: z każdej strony i z każdymi filtrami prowadzi
 * na czyste „/” (świadomie, decyzja z tabeli przejść FMN-5).
 *
 * Wyjątek (wiersz 22 z 03.10, ten sam mechanizm co FMN-7-025 przy „Mapie”):
 * na czystym „/” zwraca null. Wcześniej navigate("/") dokładał przy każdym
 * tapie wpis z tym samym adresem (zmierzone: idx +1, adres, przewinięcie i
 * lista bez zmian), więc do wyjścia albo powrotu na listę z filtrami trzeba
 * było o jeden „wstecz” więcej na każdy dodatkowy tap.
 */
export function bottomNavDiscoverTarget(pathname: string, search: string): string | null {
  if (pathname === "/" && new URLSearchParams(search).toString() === "") return null;
  return "/";
}
