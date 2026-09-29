import { describe, expect, it } from "vitest"

import { ALTALANOS_AUTH_HIBA, authHibaSzoveg } from "./auth-hiba"

/**
 * A BELEPESI HIBAK MAGYARUL. MI PIROSIT: ha a szerver angol, nyers szovege a
 * vevo ele kerul; ha egy ismert eset (rossz jelszo, mar letezo fiok) az
 * altalanos mondatot kapja.
 */
describe("a belépési hibák magyarul", () => {
  it("rossz e-mail vagy jelszó: saját mondat (a stage-en mért szöveggel)", () => {
    expect(authHibaSzoveg(new Error("Invalid email or password"))).toBe(
      "Hibás e-mail-cím vagy jelszó.",
    )
    expect(authHibaSzoveg("Error: Invalid email or password")).toBe(
      "Hibás e-mail-cím vagy jelszó.",
    )
  })

  it("már létező fiók: a belépésre küld", () => {
    expect(
      authHibaSzoveg(new Error("Identity with email already exists")),
    ).toContain("Jelentkezz be")
  })

  it("minden más az általános mondatot kapja, a nyers szöveg nem megy ki", () => {
    const szoveg = authHibaSzoveg(new Error("ECONNREFUSED 127.0.0.1:9000"))
    expect(szoveg).toBe(ALTALANOS_AUTH_HIBA)
    expect(szoveg).not.toContain("ECONNREFUSED")
    expect(authHibaSzoveg(undefined)).toBe(ALTALANOS_AUTH_HIBA)
  })
})
