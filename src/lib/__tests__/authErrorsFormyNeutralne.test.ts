import { describe, expect, it } from "vitest";
import { EXISTING_ACCOUNT_ERROR, translateAuthError } from "../authErrors";

// AN-12-010: komunikaty do rodzica bez form tylko męskich („zakładałeś”).
// Granica przez (?!\p{L}), nie \b: JS-owe \b nie widzi „ś” jako litery, więc /łeś\b/ nie łapie „zakładałeś je”.
const MESKIE = /(łeś|łbyś)(?!\p{L})/u;

describe("translateAuthError — formy neutralne (AN-12-010)", () => {
  it("konto już istnieje: bez formy męskiej, wskazówka o Google zostaje", () => {
    const t = translateAuthError(new Error(EXISTING_ACCOUNT_ERROR));
    expect(t).not.toMatch(MESKIE);
    expect(t).toContain("konto powstało przez Google");
  });

  it("złe dane logowania: bez formy męskiej, wskazówka o Google zostaje", () => {
    const t = translateAuthError(new Error("Invalid login credentials"));
    expect(t).not.toMatch(MESKIE);
    expect(t).toContain("konto powstało przez Google");
  });
});
