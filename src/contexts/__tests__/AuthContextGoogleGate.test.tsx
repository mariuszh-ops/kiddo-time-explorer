import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { STORAGE_KEYS } from "@/lib/storage";
import { TERMS_METADATA_KEY, TERMS_REQUIRED_ERROR, __resetTermsConsentMemory } from "@/lib/termsConsent";

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
const updateUser = vi.fn().mockResolvedValue({ error: null });
const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
let authCallback: ((event: string, session: unknown) => void) | null = null;

vi.mock("@/lib/catalogClient", () => ({
  CATALOG_AUTH_STORAGE_KEY: "sb-catalog-auth",
  clearCatalogAuthStorage: vi.fn(),
  catalogClient: {
    auth: {
      getSession: (...a: unknown[]) => getSession(...a),
      signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a),
      updateUser: (...a: unknown[]) => updateUser(...a),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("I-07b: bramka zgody w signInWithGoogle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTermsConsentMemory();
    signInWithOAuth.mockClear();
    updateUser.mockClear();
    authCallback = null;
  });

  it("bez zgody nie wysyla ZADNEGO zadania OAuth", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await expect(result.current.signInWithGoogle()).rejects.toThrow(TERMS_REQUIRED_ERROR);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("ze zgoda startuje OAuth normalnie", async () => {
    window.localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "2026-09-01T10:00:00.000Z");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await result.current.signInWithGoogle();
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth.mock.calls[0][0]).toMatchObject({ provider: "google" });
  });

  it("po zalogowaniu dopisuje dowod zgody do user_metadata", async () => {
    window.localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "2026-09-01T10:00:00.000Z");
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authCallback).toBeTruthy());

    authCallback?.("SIGNED_IN", { user: { id: "u1", email: "a@b.pl", user_metadata: {} } });

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    expect(updateUser.mock.calls[0][0]).toEqual({
      data: { [TERMS_METADATA_KEY]: "2026-09-01T10:00:00.000Z" },
    });
  });

  it("konto z dowodem w bazie odblokowuje bramke na nowym urzadzeniu", async () => {
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authCallback).toBeTruthy());

    authCallback?.("SIGNED_IN", {
      user: { id: "u1", email: "a@b.pl", user_metadata: { [TERMS_METADATA_KEY]: "2026-08-01T09:00:00.000Z" } },
    });

    await waitFor(() =>
      expect(window.localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED)).toBe("2026-08-01T09:00:00.000Z"),
    );
    // Dowod juz jest — nie nadpisujemy go data logowania.
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("konto bez zgody lokalnie NIE dostaje falszywego wpisu w dowodzie", async () => {
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authCallback).toBeTruthy());

    authCallback?.("SIGNED_IN", { user: { id: "legacy", email: "old@b.pl", user_metadata: {} } });

    await new Promise((r) => setTimeout(r, 30));
    expect(updateUser).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED)).toBeNull();
  });
});
