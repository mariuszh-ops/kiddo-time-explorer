import { describe, expect, it } from "vitest";
import { noteRefreshResponse, takeRefreshRejection } from "@/lib/sessionRecovery";

// GL-1-005: komunikat o wygasnieciu tylko dla SIGNED_OUT tuz po odrzuconym odswiezeniu.
describe("takeRefreshRejection", () => {
  it("4xx na refresh, SIGNED_OUT zaraz potem = odrzucone (raz)", () => {
    noteRefreshResponse(401, 1_000);
    expect(takeRefreshRejection(1_050)).toBe(true);
    expect(takeRefreshRejection(1_060)).toBe(false);
    noteRefreshResponse(400, 2_000);
    expect(takeRefreshRejection(2_010)).toBe(true);
  });

  it("udany refresh albo blad przejsciowy (5xx) nie zostawia znacznika", () => {
    noteRefreshResponse(401, 1_000);
    noteRefreshResponse(200, 1_100);
    expect(takeRefreshRejection(1_150)).toBe(false);
    noteRefreshResponse(503, 1_200);
    expect(takeRefreshRejection(1_250)).toBe(false);
  });

  it("SIGNED_OUT dlugo po odrzuceniu (np. zwykle Wyloguj) = nie", () => {
    noteRefreshResponse(400, 1_000);
    expect(takeRefreshRejection(1_000 + 60_000)).toBe(false);
  });
});
