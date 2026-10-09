import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeHref } from "@/lib/safeUrl";

/**
 * Domknięcie 09.10 (DK-4-053, P3): link „Strona organizatora” na karcie atrakcji
 * brał public_activities.website prosto do href, a kolumna nie ma CHECK
 * (activity_submissions ma `website ~* '^https?://'`). Do href ma trafić tylko http/https.
 */
describe("safeHref", () => {
  it.each([
    ["https://przyklad.pl/cennik", "https://przyklad.pl/cennik"],
    ["http://przyklad.pl", "http://przyklad.pl"],
    ["www.przyklad.pl", "https://www.przyklad.pl"],
    ["  https://przyklad.pl  ", "https://przyklad.pl"],
  ])("przepuszcza http/https: %s", (wej, wyj) => {
    expect(safeHref(wej)).toBe(wyj);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "mailto:a@b.pl",
    "ftp://przyklad.pl",
    "",
    null,
    undefined,
  ])("odrzuca: %s", (wej) => {
    expect(safeHref(wej as string | null | undefined)).toBeNull();
  });
});

describe("ActivityDetail: website do href tylko przez safeHref (DK-4-053)", () => {
  const zrodlo = readFileSync(resolve(__dirname, "../../pages/ActivityDetail.tsx"), "utf-8");

  it("details.website powstaje z safeHref(activity.website)", () => {
    expect(zrodlo).toMatch(/website:\s*safeHref\(activity\.website\)/);
  });

  it("żaden href nie bierze surowego activity.website", () => {
    expect(zrodlo).not.toMatch(/href=\{\s*activity\.website\s*\}/);
  });
});
