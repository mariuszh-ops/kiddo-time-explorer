import { useEffect, useState } from "react";
import { env } from "@/config/env";

/**
 * Dev-only floating diagnostic panel.
 *
 * Shows live values of `--header-h` and `--bottom-nav-h` CSS variables, plus
 * which measurement source (ResizeObserver vs resize/orientationchange
 * fallback) was selected by Header and BottomNav at mount time.
 *
 * Source flags are written by Header/BottomNav onto `window.__ffLayoutSource`.
 * Panel is hidden in production and can be toggled with Alt+L. Persists
 * open/closed state in localStorage so reloads stay quiet.
 */

type Source = "resize-observer" | "fallback" | "unknown";

declare global {
  interface Window {
    __ffLayoutSource?: { header?: Source; bottomNav?: Source };
  }
}

const STORAGE_KEY = "ff:layout-diagnostics-open";

const LayoutDiagnostics = () => {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [tick, setTick] = useState(0);

  // Toggle with Alt+L
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        setOpen((v) => {
          const next = !v;
          window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Re-read CSS vars on resize/orientation; also poll once per second so
  // fallback updates show up even without a resize event.
  useEffect(() => {
    if (!open) return;
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      window.clearInterval(id);
    };
  }, [open]);

  if (!env.isDev) return null;

  const css = (name: string) =>
    typeof window === "undefined"
      ? "—"
      : getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim() || "—";

  const sources = (typeof window !== "undefined" && window.__ffLayoutSource) || {};
  const headerSrc: Source = sources.header ?? "unknown";
  const navSrc: Source = sources.bottomNav ?? "unknown";

  const badge = (s: Source) => {
    const map: Record<Source, string> = {
      "resize-observer": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      fallback: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      unknown: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
    };
    const label: Record<Source, string> = {
      "resize-observer": "ResizeObserver",
      fallback: "fallback",
      unknown: "—",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${map[s]}`}>
        {label[s]}
      </span>
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          window.localStorage.setItem(STORAGE_KEY, "1");
        }}
        title="Layout diagnostics (Alt+L)"
        className="fixed bottom-2 left-2 z-[9999] px-2 py-1 rounded-md text-[10px] font-mono bg-zinc-900/80 text-zinc-100 border border-zinc-700 shadow-lg backdrop-blur-sm hover:bg-zinc-800"
      >
        ⓘ layout
      </button>
    );
  }

  // Suppress tick lint; it is the trigger for re-render only.
  void tick;

  return (
    <div className="fixed bottom-2 left-2 z-[9999] w-[230px] rounded-md bg-zinc-900/90 text-zinc-100 border border-zinc-700 shadow-xl backdrop-blur-sm font-mono text-[11px]">
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-700">
        <span className="font-semibold tracking-wide text-[10px] uppercase text-zinc-300">
          Layout (dev)
        </span>
        <button
          type="button"
          aria-label="Close diagnostics"
          onClick={() => {
            setOpen(false);
            window.localStorage.setItem(STORAGE_KEY, "0");
          }}
          className="text-zinc-400 hover:text-zinc-100 px-1 leading-none"
        >
          ×
        </button>
      </div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 px-2 py-2">
        <dt className="text-zinc-400">--header-h</dt>
        <dd className="text-right">{css("--header-h")}</dd>
        <dt className="text-zinc-400">--bottom-nav-h</dt>
        <dd className="text-right">{css("--bottom-nav-h")}</dd>
        <dt className="text-zinc-400">vh / svh</dt>
        <dd className="text-right">
          {typeof window !== "undefined" ? `${window.innerHeight}px` : "—"}
        </dd>
        <dt className="text-zinc-400">header</dt>
        <dd className="text-right">{badge(headerSrc)}</dd>
        <dt className="text-zinc-400">bottomNav</dt>
        <dd className="text-right">{badge(navSrc)}</dd>
      </dl>
      <div className="px-2 pb-2 text-[9px] text-zinc-500">Alt+L to toggle</div>
    </div>
  );
};

export default LayoutDiagnostics;