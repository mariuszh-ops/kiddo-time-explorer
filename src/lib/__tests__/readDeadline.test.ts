import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { READ_TIMEOUT_MS, readDeadline } from "@/lib/readDeadline";

describe("readDeadline (GL-7-026/030)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborts with AbortError after 10 s by default", () => {
    const d = readDeadline();
    vi.advanceTimersByTime(READ_TIMEOUT_MS - 1);
    expect(d.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(d.signal.aborted).toBe(true);
    // postgrest-js does not retry AbortError (it would retry a TimeoutError)
    expect((d.signal.reason as DOMException).name).toBe("AbortError");
  });

  it("clear() keeps a finished read from being aborted later", () => {
    const d = readDeadline(500);
    d.clear();
    vi.advanceTimersByTime(60_000);
    expect(d.signal.aborted).toBe(false);
  });
});
