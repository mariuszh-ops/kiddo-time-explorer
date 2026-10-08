import { describe, it, expect } from "vitest";
import { RATE_LIMIT_MESSAGE, isRateLimitError, userFacingError } from "@/lib/userFacingError";

/**
 * AF-10-005: surowy (angielski) error.message z Supabase/sieci nie trafia do użytkownika;
 * polski tekst limitu z triggera bazy (PT429) przechodzi bez zmian.
 */
const FALLBACK = "Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo napisz na kontakt@familyfun.pl.";

describe("userFacingError (AF-10-005/036)", () => {
  it("błąd sieci i PostgREST po angielsku -> polski komunikat z działaniem", () => {
    expect(userFacingError({ message: "Failed to fetch", code: "" }, FALLBACK)).toBe(FALLBACK);
    expect(userFacingError(new TypeError("NetworkError when attempting to fetch resource."), FALLBACK)).toBe(FALLBACK);
    expect(
      userFacingError({ code: "42501", message: 'new row violates row-level security policy for table "issue_reports"' }, FALLBACK),
    ).toBe(FALLBACK);
    expect(userFacingError(null, FALLBACK)).toBe(FALLBACK);
    expect(userFacingError(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("limit z triggera (PT429, tekst po polsku) -> tekst triggera", () => {
    const trigger = "Zbyt wiele zgłoszeń dla tego miejsca. Spróbuj ponownie za godzinę.";
    expect(userFacingError({ code: "PT429", message: trigger }, FALLBACK, RATE_LIMIT_MESSAGE)).toBe(trigger);
    const opinie = "Możesz dodać najwyżej 5 opinii na godzinę. Spróbuj ponownie później.";
    expect(userFacingError({ code: "P0001", message: ` ${opinie} ` }, FALLBACK)).toBe(opinie);
  });

  it("limit bez polskiego tekstu (bramka, 429 po angielsku) -> polski komunikat limitu, nie surowy tekst", () => {
    expect(userFacingError({ code: "PT429", message: "rate limit exceeded" }, FALLBACK, RATE_LIMIT_MESSAGE)).toBe(RATE_LIMIT_MESSAGE);
    expect(userFacingError({ status: 429, message: "Too Many Requests" }, FALLBACK, RATE_LIMIT_MESSAGE)).toBe(RATE_LIMIT_MESSAGE);
    expect(userFacingError({ code: "PT429", message: "" }, FALLBACK, RATE_LIMIT_MESSAGE)).toBe(RATE_LIMIT_MESSAGE);
    // bez osobnego komunikatu limitu -> fallback
    expect(userFacingError({ status: 429, message: "Too Many Requests" }, FALLBACK)).toBe(FALLBACK);
  });

  it("P0001 po angielsku nie przechodzi (polski tylko z triggera)", () => {
    expect(userFacingError({ code: "P0001", message: "unexpected failure" }, FALLBACK)).toBe(FALLBACK);
  });

  it("isRateLimitError rozpoznaje kod, status i treść", () => {
    expect(isRateLimitError({ code: "PT429" })).toBe(true);
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError({ message: "Email rate limit exceeded" })).toBe(true);
    expect(isRateLimitError({ message: "Zbyt wiele zgłoszeń w tej chwili." })).toBe(true);
    expect(isRateLimitError({ message: "Failed to fetch" })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });
});
