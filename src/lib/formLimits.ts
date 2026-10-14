/**
 * AN-8-006 / AN-8-010: limity pól formularzy zgłoszeń = CHECK-i bazy.
 * Dłuższą wartość baza odrzuca (sqlstate 23514), a użytkownik dostaje tylko ogólny toast
 * „Nie udało się wysłać zgłoszenia”, więc UI pilnuje tego samego limitu przed wysyłką.
 */

/** issue_reports.contact_email: CHECK (char_length(contact_email) <= 200) — „Zgłoś opinię” i „Zgłoś błąd w danych”. */
export const CONTACT_EMAIL_MAX = 200;
