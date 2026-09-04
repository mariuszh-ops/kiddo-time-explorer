import { describe, expect, it } from "vitest";
import { mapSupabaseUser } from "@/contexts/AuthContext";

// I-11: nazwa wyświetlana żyje w user_metadata.display_name, bo full_name/name
// Google nadpisuje przy każdym logowaniu OAuth.
describe("mapSupabaseUser (I-11)", () => {
  it("display_name wygrywa z full_name i name z Google", () => {
    const u = mapSupabaseUser({
      id: "1",
      email: "a@b.pl",
      user_metadata: { display_name: "Mama Zosi", full_name: "Anna Kowalska", name: "Anna" },
    });
    expect(u?.name).toBe("Mama Zosi");
  });

  it("bez display_name: full_name, potem name", () => {
    expect(
      mapSupabaseUser({ id: "1", email: "a@b.pl", user_metadata: { full_name: "Anna Kowalska", name: "Anna" } })?.name
    ).toBe("Anna Kowalska");
    expect(mapSupabaseUser({ id: "1", email: "a@b.pl", user_metadata: { name: "Anna" } })?.name).toBe("Anna");
    expect(mapSupabaseUser({ id: "1", email: "a@b.pl", user_metadata: {} })?.name).toBeUndefined();
  });

  it("display_name pusty albo niebędący tekstem jest pomijany", () => {
    expect(
      mapSupabaseUser({ id: "1", email: "a@b.pl", user_metadata: { display_name: "   ", full_name: "Anna" } })?.name
    ).toBe("Anna");
    expect(
      mapSupabaseUser({ id: "1", email: "a@b.pl", user_metadata: { display_name: { x: 1 }, full_name: "Anna" } })?.name
    ).toBe("Anna");
  });

  it("new_email trafia do pendingEmail, providers z app_metadata", () => {
    const u = mapSupabaseUser({
      id: "1",
      email: "a@b.pl",
      new_email: "nowy@b.pl",
      app_metadata: { providers: ["email", "google"] },
      user_metadata: {},
    });
    expect(u?.pendingEmail).toBe("nowy@b.pl");
    expect(u?.providers).toEqual(["email", "google"]);
    expect(mapSupabaseUser({ id: "1", email: "a@b.pl" })?.pendingEmail).toBeUndefined();
    expect(mapSupabaseUser({ id: "1", email: "a@b.pl" })?.providers).toBeUndefined();
  });

  it("brak usera → null", () => {
    expect(mapSupabaseUser(null)).toBeNull();
  });
});
