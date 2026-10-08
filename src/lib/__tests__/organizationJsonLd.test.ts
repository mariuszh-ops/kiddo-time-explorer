import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildOrganizationJsonLd, SOCIAL_PROFILES } from "@/lib/organizationJsonLd";

/**
 * Audyt finalny 750 (AF-3-050, P3): Organization występował tylko jako
 * publisher/author artykułu w BlogPostPage — brak samodzielnego bloku z logo
 * i kontaktem na stronie głównej.
 */
const pngWymiary = (plik: string) => {
  const b = readFileSync(plik);
  expect(b.readUInt32BE(0)).toBe(0x89504e47);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe("buildOrganizationJsonLd (AF-3-050)", () => {
  it("samodzielny Organization: name, url, @id, logo z public/ (>= 112 px), kontakt", () => {
    const org = buildOrganizationJsonLd(false);
    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("FamilyFun");
    expect(org.url).toBe("https://familyfun.pl");
    expect(org["@id"]).toBe("https://familyfun.pl/#organization");

    // Logo musi istnieć w public/ (serwowane pod tą samą ścieżką), być prawdziwym PNG
    // (serwer wysyła image/png z nosniff po rozszerzeniu) i spełniać minimum Google 112x112.
    const logo = new URL(org.logo);
    expect(logo.origin).toBe("https://familyfun.pl");
    const { w, h } = pngWymiary(resolve(process.cwd(), "public", logo.pathname.slice(1)));
    expect(w).toBeGreaterThanOrEqual(112);
    expect(h).toBeGreaterThanOrEqual(112);

    expect(org.email).toBe("kontakt@familyfun.pl");
    expect(org.contactPoint).toMatchObject({ "@type": "ContactPoint", email: "kontakt@familyfun.pl" });
    // Blok przechodzi przez JSON.stringify w SEOHead — bez undefined po drodze.
    expect(JSON.parse(JSON.stringify(org))).toEqual(org);
  });

  it("sameAs tylko gdy stopka pokazuje profile (FEATURES.SOCIAL_LINKS)", () => {
    expect(buildOrganizationJsonLd(false)).not.toHaveProperty("sameAs");
    const z = buildOrganizationJsonLd(true) as { sameAs?: string[] };
    expect(z.sameAs).toEqual(Object.values(SOCIAL_PROFILES));
    expect(z.sameAs?.every((u) => u.startsWith("https://"))).toBe(true);
  });

  it("strona główna wysyła Organization obok WebSite, a stopka bierze profile z tego samego źródła", () => {
    const index = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
    expect(index).toMatch(/"@type": "WebSite"/);
    expect(index).toMatch(/buildOrganizationJsonLd\(\)/);
    const footer = readFileSync(resolve(process.cwd(), "src/components/Footer.tsx"), "utf8");
    expect(footer).toMatch(/SOCIAL_PROFILES\.instagram/);
    expect(footer).toMatch(/SOCIAL_PROFILES\.facebook/);
    expect(footer).not.toMatch(/https:\/\/(instagram|facebook)\.com/);
  });
});
