// Tłumaczenie komunikatów błędów autoryzacji na polski.

/** Rozpoznaje HTTP 429 / over_email_send_rate_limit z odpowiedzi Supabase Auth. */
export const isEmailRateLimitError = (error: unknown): boolean => {
  const e = error as { code?: string; status?: number; message?: string } | null;
  const raw = typeof error === "string" ? error : (e?.message ?? "");
  const msg = raw.toLowerCase();
  if (e?.code === "over_email_send_rate_limit") return true;
  if (msg.includes("over_email_send_rate_limit")) return true;
  if (e?.status === 429 && (msg.includes("email") || msg.includes("rate limit"))) return true;
  return false;
};

export const translateAuthError = (error: unknown): string => {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();

  if (isEmailRateLimitError(error)) {
    // M-14: GoTrue `smtp_max_frequency` = 60 s — krótszy termin w komunikacie kłamie.
    return "Poczekaj minutę przed kolejną próbą — wiadomość już wysłaliśmy.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Ten e-mail jest już zajęty. Zaloguj się lub odzyskaj hasło.";
  }
  if (msg.includes("password should be at least") || msg.includes("weak password")) {
    return "Hasło jest za słabe — potrzeba min. 8 znaków, małej i wielkiej litery, cyfry oraz znaku specjalnego.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Nieprawidłowy e-mail lub hasło.";
  }
  if (msg.includes("email not confirmed")) {
    return "Konto nie jest jeszcze potwierdzone. Sprawdź skrzynkę i kliknij link w wiadomości.";
  }
  if (msg.includes("unable to validate email") || msg.includes("invalid email")) {
    return "Podaj poprawny adres e-mail.";
  }
  // I-11 (zmiana hasla w /profile)
  if (msg.includes("different from the old password") || msg.includes("same_password")) {
    return "Nowe hasło musi różnić się od obecnego.";
  }
  if (msg.includes("reauthentication")) {
    // M-13: gdy w Supabase wlaczone "Secure password change" - potrzebny kod z e-maila.
    return "Potwierdź zmianę kodem, który wysłaliśmy na Twój e-mail.";
  }
  if (msg.includes("nonce")) {
    return "Kod jest nieprawidłowy lub wygasł. Poproś o nowy.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }
  return "Coś poszło nie tak. Spróbuj ponownie.";
};
