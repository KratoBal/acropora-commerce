import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { hu } from "@lib/i18n/dictionary/hu"

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

  /**
   * A SZOVEG SZOTAR-KULCSBOL JON: a forras a kulcsokat nevezi meg, a magyar
   * mondatok a szotarban allnak. Mindket oldalt merjuk, kulonben a kulcs
   * lehetne egy masik mondat kulcsa.
   */
  it("a három mondat szótár-kulcsból áll, magyarul", () => {
    for (const kulcs of [
      "cartPage.signInHeading",
      "cartPage.signInText",
      "cartPage.signInButton",
    ]) {
      expect(forras()).toContain(kulcs)
    }
    expect(hu.cartPage.signInHeading).toBe("Van már fiókod?")
    expect(hu.cartPage.signInText).toBe("Jelentkezz be, és gyorsabban végzel.")
    expect(hu.cartPage.signInButton).toBe("Bejelentkezés")
  })

  it("a starter angol mondatai sem a forrásban, sem a magyar szótárban nincsenek ott", () => {
    for (const regi of [
      "Already have an account?",
      "Sign in for a better experience.",
    ]) {
      expect(forras()).not.toContain(regi)
      expect(JSON.stringify(hu.cartPage)).not.toContain(regi)
    }
  })
})
