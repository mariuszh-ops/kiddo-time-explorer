import { describe, expect, it } from "vitest";
import { bezpieczneWyjscie } from "@/lib/safeRedirect";

describe("bezpieczneWyjscie", () => {
  it("odrzuca schematy wykonujace kod", () => {
    expect(bezpieczneWyjscie("javascript:alert(1)")).toBeNull();
    expect(bezpieczneWyjscie("JaVaScRiPt:alert(1)")).toBeNull();
    // Parser URL wycina tabulatory i znaki nowej linii, wiec prefiks trzeba
    // sprawdzac PO sparsowaniu, nie na surowym stringu.
    expect(bezpieczneWyjscie("java\nscript:alert(1)")).toBeNull();
    expect(bezpieczneWyjscie("  javascript:alert(1)")).toBeNull();
    expect(bezpieczneWyjscie("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(bezpieczneWyjscie("vbscript:msgbox(1)")).toBeNull();
    expect(bezpieczneWyjscie("file:///C:/Windows/win.ini")).toBeNull();
  });

  it("odrzuca puste i nie-stringi", () => {
    expect(bezpieczneWyjscie("")).toBeNull();
    expect(bezpieczneWyjscie("   ")).toBeNull();
    expect(bezpieczneWyjscie(null)).toBeNull();
    expect(bezpieczneWyjscie(undefined)).toBeNull();
    expect(bezpieczneWyjscie(42)).toBeNull();
  });

  it("przepuszcza obcy origin — o to chodzi w OAuth", () => {
    expect(bezpieczneWyjscie("https://claude.ai/api/mcp/callback?code=abc")).toBe(
      "https://claude.ai/api/mcp/callback?code=abc",
    );
    expect(bezpieczneWyjscie("http://localhost:6274/oauth/callback")).toBe(
      "http://localhost:6274/oauth/callback",
    );
  });

  it("przepuszcza prywatny schemat klienta natywnego (RFC 8252)", () => {
    expect(bezpieczneWyjscie("com.example.app:/cb?code=abc")).toBe("com.example.app:/cb?code=abc");
  });

  it("rozwija adres wzgledny wzgledem naszego originu", () => {
    expect(bezpieczneWyjscie("/moje-miejsca")).toBe(`${window.location.origin}/moje-miejsca`);
  });
});
