import { describe, expect, it } from "vitest"

import { translator } from "@lib/i18n/dictionary"

import {
  ALTALANOS_AUTH_HIBA,
  authHibaFelirat,
  authHibaKod,
  authHibaSzoveg,
  type AuthHibaKod,
} from "./auth-hiba"

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

  it("a háttér korlátja és rövid jelszava magyarul (audit P1/8)", () => {
    expect(
      authHibaSzoveg(
        new Error("Too many attempts, try again in a few minutes."),
      ),
    ).toContain("Túl sok próbálkozás")
    expect(
      authHibaSzoveg(new Error("The password must be at least 10 characters.")),
    ).toBe("A jelszó legalább 10 karakter legyen.")
  })

  it("minden más az általános mondatot kapja, a nyers szöveg nem megy ki", () => {
    const szoveg = authHibaSzoveg(new Error("ECONNREFUSED 127.0.0.1:9000"))
    expect(szoveg).toBe(ALTALANOS_AUTH_HIBA)
    expect(szoveg).not.toContain("ECONNREFUSED")
    expect(authHibaSzoveg(undefined)).toBe(ALTALANOS_AUTH_HIBA)
  })
})

/**
 * A HIBA KODJA ES A KOD MONDATA A LAP NYELVEN (2026-11-03). MI PIROSIT: ha egy
 * kodhoz egyik nyelven nincs mondat (a komponens kulcs nelkul allna); ha a
 * nyers szerver-szoveg kod helyett kijut; ha az angol utra magyar mondat marad.
 */
describe("a belépési hiba kódja", () => {
  const hu = translator("hu")
  const en = translator("en")

  it("az ismert nyers szövegekből kód lesz, minden másból az általános", () => {
    expect(authHibaKod(new Error("Invalid email or password"))).toBe(
      "invalid_credentials",
    )
    expect(authHibaKod(new Error("Too many attempts, try later"))).toBe(
      "too_many_attempts",
    )
    expect(
      authHibaKod(new Error("The password must be at least 10 characters.")),
    ).toBe("password_short")
    expect(authHibaKod(new Error("Identity with email already exists"))).toBe(
      "email_taken",
    )
    expect(authHibaKod(new Error("ECONNREFUSED"))).toBe("generic")
    expect(authHibaKod(undefined)).toBe("generic")
  })

  it("minden kódnak van mondata mindkét nyelven, és a két nyelv mondata más", () => {
    const kodok: AuthHibaKod[] = [
      "invalid_credentials",
      "too_many_attempts",
      "password_short",
      "email_taken",
      "generic",
      "aszf_required",
      "passwords_differ",
    ]
    for (const kod of kodok) {
      const magyar = authHibaFelirat(kod, hu)
      const angol = authHibaFelirat(kod, en)
      expect(magyar, kod).toBeTruthy()
      expect(angol, kod).toBeTruthy()
      expect(angol, kod).not.toBe(magyar)
      // an unfilled placeholder would reach the customer
      expect(magyar + angol, kod).not.toMatch(/\{\w+\}/)
    }
  })

  it("a rövid jelszó mondata a minimális hosszal áll, mindkét nyelven", () => {
    expect(authHibaFelirat("password_short", hu)).toBe(
      "A jelszó legalább 10 karakter legyen.",
    )
    expect(authHibaFelirat("password_short", en)).toBe(
      "The password must be at least 10 characters long.",
    )
  })
})
