// Tłumaczenie komunikatów błędów autoryzacji na polski.
export const translateAuthError = (error: unknown): string => {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();

  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Ten e-mail jest już zajęty. Zaloguj się lub odzyskaj hasło.";
  }
  if (msg.includes("password should be at least") || msg.includes("weak password")) {
    return "Hasło jest za słabe — użyj minimum 6 znaków (najlepiej dłuższego hasła).";
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
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }
  return "Coś poszło nie tak. Spróbuj ponownie.";
};
