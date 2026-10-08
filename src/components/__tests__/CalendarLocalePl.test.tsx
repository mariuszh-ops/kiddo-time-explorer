import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

describe("AF-7-022 kalendarz w profilu po polsku", () => {
  it("Calendar z locale pl pokazuje polska nazwe miesiaca", () => {
    const { container } = render(<Calendar mode="single" month={new Date(2026, 9, 1)} locale={pl} />);
    expect(container.textContent).toMatch(/październik/i);
    expect(container.textContent).not.toMatch(/October/);
  });

  it("Profile.tsx przekazuje locale={pl} do Calendar", () => {
    const src = readFileSync(resolve(__dirname, "../../pages/Profile.tsx"), "utf8");
    const bloki = [...src.matchAll(/<Calendar\b[\s\S]*?\/>/g)].map((m) => m[0]);
    expect(bloki.length).toBeGreaterThan(0);
    for (const b of bloki) expect(b).toMatch(/locale=\{pl\}/);
  });
});
