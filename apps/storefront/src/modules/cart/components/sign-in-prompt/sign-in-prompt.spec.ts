import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A BEJELENTKEZES-DOBOZ SZOVEGE MAGYARUL ALL.
 *
 * A kirakat tobbi angol feliratat ma este atirtak (47 fajl); a kosar mappaja
 * szandekosan maradt ki, mert itt kulon munka folyt, es ez a harom mondat volt
 * a maradek.
 *
 * KET IRANYBOL MER, es a masodik a fontosabb: az elso a mai allapotot rogziti,
 * a masodik a VISSZACSUSZAST fogja meg -- ha valaki a starter alakjat masolja
 * vissza, a regi angol mondat megjelenik, es ez pirosra valt.
 */
const FAJL = join(
  process.cwd(),
  "src/modules/cart/components/sign-in-prompt/index.tsx",
)

const forras = () => readFileSync(FAJL, "utf-8")

describe("a bejelentkezés-doboz szövege", () => {
  /** ISMERT POZITIV KONTROLL: tenyleg ezt a komponenst olvastuk be. */
  it("a forrás olvasható, és ez tényleg a bejelentkezés-doboz", () => {
    expect(forras()).toContain("SignInPrompt")
    expect(forras()).toContain('data-testid="sign-in-button"')
  })

  it("a három mondat magyarul áll", () => {
    expect(forras()).toContain("Van már fiókod?")
    expect(forras()).toContain("Jelentkezz be, és gyorsabban végzel.")
    expect(forras()).toContain("Bejelentkezés")
  })

  it("a starter angol mondatai nincsenek ott", () => {
    expect(forras()).not.toContain("Already have an account?")
    expect(forras()).not.toContain("Sign in for a better experience.")
  })
})
