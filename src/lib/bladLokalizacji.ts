/**
 * FMN-B62: komunikat po błędzie „Moja lokalizacja" (navigator.geolocation).
 *
 * Wcześniej KAŻDY błąd traktowano jak odmowę: toast „Włącz lokalizację
 * w ustawieniach przeglądarki" i przycisk nieaktywny do przeładowania strony.
 * Słaby GPS w budynku (timeout 8 s) przy włączonej lokalizacji dawał więc
 * fałszywą radę i żadnej drugiej próby (FMN-6-022/047/049/053, 26.09: 4/4;
 * ponowienie 0/3). Po odmowie i zmianie ustawień też trzeba było przeładować.
 */

/**
 * GeolocationPositionError.PERMISSION_DENIED. Porównujemy liczbę, a nie stałą
 * z obiektu błędu: obiekt bywa zwykłym `{ code }` (polyfill, podmiana w teście).
 */
const KOD_ODMOWY = 1;

export const KOMUNIKAT_ODMOWY = "Włącz lokalizację w ustawieniach przeglądarki";
export const KOMUNIKAT_BRAK_POZYCJI = "Nie udało się ustalić Twojej pozycji. Spróbuj ponownie.";

/**
 * Tekst toastu dla kodu błędu: 1 = odmowa (rada o ustawieniach); 2 (pozycja
 * niedostępna), 3 (timeout) i każdy inny = „spróbuj ponownie". Przycisk zostaje
 * aktywny w obu przypadkach: po zmianie ustawień rodzic klika jeszcze raz, bez
 * przeładowania; przy trwałej odmowie przeglądarka odpowiada od razu kodem 1.
 */
export function komunikatBleduLokalizacji(kod: number | undefined): string {
  return kod === KOD_ODMOWY ? KOMUNIKAT_ODMOWY : KOMUNIKAT_BRAK_POZYCJI;
}
