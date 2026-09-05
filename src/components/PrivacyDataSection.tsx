import DeleteAccountSection from "@/components/DeleteAccountSection";

/**
 * Karta „Prywatność i dane" w /profile: usunięcie konta (S-131).
 *
 * Przycisk „Pobierz kopię swoich danych (JSON)" (N-20) został 05.09.2026
 * USUNIĘTY decyzją właściciela — pozycja planu M-10b. Powody: plik JSON jest
 * nieczytelny dla rodzica szukającego atrakcji, a mimo to nie był pełną kopią
 * z art. 15 RODO (brak client_errors i auth.identities), więc obiecywał mniej,
 * niż sugerowała nazwa.
 *
 * Jedyna droga do kopii danych: mail na kontakt@familyfun.pl → operator
 * uruchamia 7_public/eksport_uzytkownika.py (7 źródeł, dopasowanie po user_id
 * i po mailu) i odsyła komplet w 30 dni. To jest ścieżka z art. 15 i 20 RODO
 * i ona jedna była nią zawsze — przycisk nie był wymogiem prawnym.
 *
 * NIE przywracaj tego przycisku „przy okazji". Wymaga nowej decyzji właściciela.
 */
const PrivacyDataSection = () => {
  return (
    <section aria-labelledby="prywatnosc-tytul" className="bg-card rounded-xl border border-border overflow-hidden">
      <h2 id="prywatnosc-tytul" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-4">
        Prywatność i dane
      </h2>

      <DeleteAccountSection />
    </section>
  );
};

export default PrivacyDataSection;
