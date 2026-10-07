import { beforeEach, describe, expect, it } from "vitest";
import { queueFlashToast, takeFlashToast } from "@/lib/flashToast";

// GL-2-039: komunikat odłożony przed pełnym przeładowaniem pokazujemy dokładnie raz.
describe("flashToast", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("returns the queued message once, then nothing", () => {
    queueFlashToast("Twoje konto zostało usunięte");
    expect(takeFlashToast()).toBe("Twoje konto zostało usunięte");
    expect(takeFlashToast()).toBeNull();
  });

  it("survives a localStorage wipe (logout clears only localStorage)", () => {
    queueFlashToast("Twoje konto zostało usunięte");
    localStorage.clear();
    expect(takeFlashToast()).toBe("Twoje konto zostało usunięte");
  });

  it("drops a stale message and removes it", () => {
    queueFlashToast("stary");
    expect(takeFlashToast(Date.now() + 61_000)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("ignores malformed entries", () => {
    sessionStorage.setItem("ff_flash_toast", "{nie-json");
    expect(takeFlashToast()).toBeNull();
    sessionStorage.setItem("ff_flash_toast", JSON.stringify({ message: 1, ts: Date.now() }));
    expect(takeFlashToast()).toBeNull();
  });
});
