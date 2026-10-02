import { describe, expect, it } from "vitest";
import {
  KOMUNIKAT_BRAK_POZYCJI,
  KOMUNIKAT_ODMOWY,
  komunikatBleduLokalizacji,
} from "@/lib/bladLokalizacji";

describe("FMN-B62: komunikat po błędzie „Moja lokalizacja”", () => {
  it("odmowa (kod 1) = rada o ustawieniach przeglądarki", () => {
    expect(komunikatBleduLokalizacji(1)).toBe(KOMUNIKAT_ODMOWY);
  });

  it("timeout (3) i pozycja niedostępna (2) = „spróbuj ponownie”, bez rady o ustawieniach", () => {
    for (const kod of [2, 3]) {
      expect(komunikatBleduLokalizacji(kod)).toBe(KOMUNIKAT_BRAK_POZYCJI);
      expect(komunikatBleduLokalizacji(kod)).not.toMatch(/ustawieniach/);
    }
  });

  it("nieznany kod albo brak kodu nie udaje odmowy", () => {
    expect(komunikatBleduLokalizacji(undefined)).toBe(KOMUNIKAT_BRAK_POZYCJI);
    expect(komunikatBleduLokalizacji(0)).toBe(KOMUNIKAT_BRAK_POZYCJI);
  });
});
