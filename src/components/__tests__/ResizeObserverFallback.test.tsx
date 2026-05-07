import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks shared across both component suites ---------------------------
vi.mock("@/lib/featureFlags", () => ({
  FEATURES: { ENABLED_CITIES: ["warszawa"] },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: false,
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    isDemoMode: false,
    toggleDemoMode: vi.fn(),
  }),
}));

// env.isDev is read at component runtime; we toggle it per test via vi.mock
// + dynamic import.
const setDevMode = (isDev: boolean) => {
  vi.doMock("@/config/env", () => ({
    env: { isDev, isProd: !isDev, mode: isDev ? "development" : "production" },
  }));
};

const renderHeader = async () => {
  const { default: Header } = await import("@/components/Header");
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

const renderBottomNav = async () => {
  const { default: BottomNav } = await import("@/components/BottomNav");
  return render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
};

const originalRO = (globalThis as any).ResizeObserver;

describe("ResizeObserver fallback dev-mode logging", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    (globalThis as any).ResizeObserver = originalRO;
    vi.doUnmock("@/config/env");
  });

  // --- Header ------------------------------------------------------------
  describe("Header", () => {
    it("logs fallback info when ResizeObserver is unavailable in dev", async () => {
      delete (globalThis as any).ResizeObserver;
      delete (window as any).ResizeObserver;
      setDevMode(true);
      await renderHeader();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((m) => m.includes("[FamilyFun] Header: ResizeObserver unavailable"))
      ).toBe(true);
    });

    it("does NOT log when ResizeObserver is unavailable but not in dev", async () => {
      delete (globalThis as any).ResizeObserver;
      delete (window as any).ResizeObserver;
      setDevMode(false);
      await renderHeader();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] Header"))).toBe(false);
    });

    it("logs fallback info when ResizeObserver throws in dev", async () => {
      class ThrowingRO {
        constructor() {
          throw new Error("boom");
        }
      }
      (globalThis as any).ResizeObserver = ThrowingRO;
      (window as any).ResizeObserver = ThrowingRO;
      setDevMode(true);
      await renderHeader();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((m) => m.includes("[FamilyFun] Header: ResizeObserver threw"))
      ).toBe(true);
    });

    it("does NOT log when ResizeObserver throws but not in dev", async () => {
      class ThrowingRO {
        constructor() {
          throw new Error("boom");
        }
      }
      (globalThis as any).ResizeObserver = ThrowingRO;
      (window as any).ResizeObserver = ThrowingRO;
      setDevMode(false);
      await renderHeader();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] Header"))).toBe(false);
    });

    it("does NOT log when ResizeObserver is available in dev", async () => {
      class NoopRO {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      (globalThis as any).ResizeObserver = NoopRO;
      (window as any).ResizeObserver = NoopRO;
      setDevMode(true);
      await renderHeader();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] Header"))).toBe(false);
    });
  });

  // --- BottomNav ---------------------------------------------------------
  describe("BottomNav", () => {
    it("logs fallback info when ResizeObserver is unavailable in dev", async () => {
      delete (globalThis as any).ResizeObserver;
      delete (window as any).ResizeObserver;
      setDevMode(true);
      await renderBottomNav();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((m) => m.includes("[FamilyFun] BottomNav: ResizeObserver unavailable"))
      ).toBe(true);
    });

    it("does NOT log when ResizeObserver is unavailable but not in dev", async () => {
      delete (globalThis as any).ResizeObserver;
      delete (window as any).ResizeObserver;
      setDevMode(false);
      await renderBottomNav();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] BottomNav"))).toBe(false);
    });

    it("logs fallback info when ResizeObserver throws in dev", async () => {
      class ThrowingRO {
        constructor() {
          throw new Error("boom");
        }
      }
      (globalThis as any).ResizeObserver = ThrowingRO;
      (window as any).ResizeObserver = ThrowingRO;
      setDevMode(true);
      await renderBottomNav();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((m) => m.includes("[FamilyFun] BottomNav: ResizeObserver threw"))
      ).toBe(true);
    });

    it("does NOT log when ResizeObserver throws but not in dev", async () => {
      class ThrowingRO {
        constructor() {
          throw new Error("boom");
        }
      }
      (globalThis as any).ResizeObserver = ThrowingRO;
      (window as any).ResizeObserver = ThrowingRO;
      setDevMode(false);
      await renderBottomNav();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] BottomNav"))).toBe(false);
    });

    it("does NOT log when ResizeObserver is available in dev", async () => {
      class NoopRO {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      (globalThis as any).ResizeObserver = NoopRO;
      (window as any).ResizeObserver = NoopRO;
      setDevMode(true);
      await renderBottomNav();
      const calls = infoSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.some((m) => m.includes("[FamilyFun] BottomNav"))).toBe(false);
    });
  });
});