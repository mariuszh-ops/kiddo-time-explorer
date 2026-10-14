import { describe, it, expect, afterEach } from "vitest";
import { render, waitFor, act, cleanup } from "@testing-library/react";
import { Toaster, toast } from "@/components/ui/sonner";

/**
 * AN-6-197 (WCAG 1.3.1, axe `list`): `role="status"` z K-13 siedzi na treści toasta,
 * a `<li data-sonner-toast>` zostaje elementem listy — `<ol>` toastów ma wyłącznie
 * dzieci `li` bez jawnej roli. Toast dalej jest ogłaszany: region `aria-live="polite"`
 * + `role="status"` obejmujący tytuł i opis; przycisk zamykania ma polską nazwę.
 */

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  cleanup();
});

describe("Toaster — rola toasta poza elementem listy (AN-6-197)", () => {
  it("li toasta bez jawnej roli, role=status na treści z tytułem i opisem", async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast.error("Nie udało się skopiować linku", { description: "Skopiuj adres ręcznie" });
    });
    const li = await waitFor(() => {
      const el = container.querySelector<HTMLElement>("[data-sonner-toast]");
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    await waitFor(() => {
      expect(li.querySelector("[data-content]")?.getAttribute("role")).toBe("status");
    });
    expect(li.hasAttribute("role")).toBe(false);
    const status = li.querySelector("[role=status]");
    expect(status?.textContent).toContain("Nie udało się skopiować linku");
    expect(status?.textContent).toContain("Skopiuj adres ręcznie");
    expect(li.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    expect(li.querySelector("[data-close-button]")?.getAttribute("aria-label")).toBe("Zamknij powiadomienie");
  });

  it("ol toastów ma wyłącznie dzieci li bez jawnej roli (także przy kilku toastach)", async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast("Pierwszy");
      toast.success("Drugi");
    });
    await waitFor(() => {
      expect(container.querySelectorAll("[data-sonner-toast] > [data-content][role=status]").length).toBe(2);
    });
    const ol = container.querySelector("ol[data-sonner-toaster]") as HTMLElement;
    expect(ol.hasAttribute("role")).toBe(false);
    const dzieci = [...ol.children];
    expect(dzieci.length).toBe(2);
    for (const d of dzieci) {
      expect(d.tagName).toBe("LI");
      expect(d.hasAttribute("role")).toBe(false);
    }
  });
});
