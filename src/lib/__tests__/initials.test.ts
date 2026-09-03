import { describe, expect, it } from "vitest";
import { getInitials } from "@/lib/initials";

describe("getInitials", () => {
  it("imię i nazwisko → dwie litery", () => {
    expect(getInitials({ name: "Mariusz Bodych", email: "x@y.pl" })).toBe("MB");
    expect(getInitials({ name: "  Anna  Maria Kowalska ", email: "x@y.pl" })).toBe("AK");
  });
  it("jednowyrazowa nazwa → jedna litera, nie dwie", () => {
    expect(getInitials({ name: "Going", email: "x@y.pl" })).toBe("G");
  });
  it("bez nazwy → z e-maila", () => {
    expect(getInitials({ email: "mariusz.bodych@goingapp.pl" })).toBe("MB");
    expect(getInitials({ email: "jan@y.pl" })).toBe("J");
    expect(getInitials({ name: "   ", email: "a_b@y.pl" })).toBe("AB");
  });
  it("brak danych → pusty string", () => {
    expect(getInitials(null)).toBe("");
    expect(getInitials({ email: "" })).toBe("");
  });
});
