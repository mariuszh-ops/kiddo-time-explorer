// Jedyne źródło prawdy dla wymagań hasła — musi odpowiadać polityce serwera (Supabase Auth).
//
// AN-5-135 (ASVS V2.1.1): minimum 12 znaków dla NOWYCH haseł — rejestracja, reset i zmiana
// hasła. Logowanie NIE sprawdza tych reguł (EmailAuthForm waliduje tylko tryb signup), więc
// stare konta z hasłem 8–11 znaków logują się dalej. Serwer (Supabase Auth
// `password_min_length`) ustawia właściciel w panelu — do tego czasu front jest ostrzejszy
// od serwera, nigdy łagodniejszy.

export const PASSWORD_MIN_LENGTH = 12;

export type PasswordCheck = {
  ok: boolean;
  minLength: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
};

export const checkPassword = (pwd: string): PasswordCheck => {
  const minLength = pwd.length >= PASSWORD_MIN_LENGTH;
  const lower = /[a-z]/.test(pwd);
  const upper = /[A-Z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  // „Znak niebędący literą ani cyfrą" — nie zamknięta lista, żeby nie odrzucać
  // znaków, które serwer akceptuje.
  const special = /[^A-Za-z0-9]/.test(pwd);
  return { ok: minLength && lower && upper && digit && special, minLength, lower, upper, digit, special };
};

export const PASSWORD_HINT = `min. ${PASSWORD_MIN_LENGTH} znaków, mała i wielka litera, cyfra, znak specjalny`;

/** Pierwszy brakujący warunek jako komunikat dla użytkownika. */
export const passwordErrorMessage = (pwd: string): string | null => {
  const c = checkPassword(pwd);
  if (c.ok) return null;
  if (!c.minLength) return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
  if (!c.lower) return "Dodaj małą literę.";
  if (!c.upper) return "Dodaj wielką literę.";
  if (!c.digit) return "Dodaj cyfrę.";
  return "Dodaj znak specjalny.";
};

export const PASSWORD_RULES: { key: keyof Omit<PasswordCheck, "ok">; label: string }[] = [
  { key: "minLength", label: `Co najmniej ${PASSWORD_MIN_LENGTH} znaków` },
  { key: "lower", label: "Mała litera" },
  { key: "upper", label: "Wielka litera" },
  { key: "digit", label: "Cyfra" },
  { key: "special", label: "Znak specjalny (np. ! @ # ?)" },
];
