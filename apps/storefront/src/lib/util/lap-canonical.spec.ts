import { describe, expect, it } from "vitest"

import { storeCanonical, termeklapCanonical } from "./lap-canonical"

/**
 * A TERMEKLAP KANONIKUS CIME.
 *
 * A leglenyegesebb allitas nem az, hogy jo utat epit, hanem hogy NEM DEKODOL.
 * A lap `generateMetadata` fuggvenyeben ott all egy dekodolt `handle` valtozo
 * is (az API-hivashoz kell), es a kezenfekvo hiba azt atadni ide. Egy URL-be a
 * KODOLT alak valo.
 */
describe("termeklap kanonikus cime", () => {
  it("a lap valodi utjat adja, orszagkoddal es a products szegmenssel", () => {
    expect(termeklapCanonical("hu", "nyos-quantum-220-eq-okos-lehabzo")).toBe(
      "/hu/products/nyos-quantum-220-eq-okos-lehabzo",
    )
  })

  /**
   * EZ AZ AZ ALLITAS, AMI A HIBAT MEGFOGJA. Valodi handle a stage boltbol.
   * Ha valaki dekodolast tesz a fuggvenybe, ez pirosodik -- es ugyanaz a hiba
   * jonne vissza, amit a ketszeres kodolas javitasa (2026-09-07) megszuntetett.
   */
  it("a kodolt handle-t VALTOZATLANUL hagyja, nem dekodolja", () => {
    const kodolt =
      "nyos-reef-putty-200g-k%C3%A9tkomponens%C5%B1-korall-ragaszt%C3%B3-fekete"

    const cim = termeklapCanonical("hu", kodolt)

    expect(cim).toBe(`/hu/products/${kodolt}`)
    expect(cim).not.toContain("kétkomponensű")
  })
})

/**
 * A STORE-LAP KANONIKUS CIME.
 *
 * A negy query-parameterbol EGY marad benne (`page`), harom kimarad. Ezert a
 * keszlet nagyobb resze a KIMARADAST meri: egy allitas-halmaz, ami csak azt
 * nezi, hogy a lapszam bekerul, ugyanugy zold lenne egy olyan fuggvenyre, ami
 * MINDEN parametert atenged -- vagyis a cim letezeset merne, nem a szuresét.
 */
describe("store-lap kanonikus cime", () => {
  it("parameter nelkul a csupasz store-lapra mutat", () => {
    expect(storeCanonical("hu")).toBe("/hu/store")
  })

  it("a masodik lap SAJAT MAGARA mutat, nem az elsore", () => {
    expect(storeCanonical("hu", 2)).toBe("/hu/store?page=2")
  })

  /**
   * AZ ELSO LAP KET ALAKBAN ERKEZHET (parameter nelkul es `?page=1`-kent), es a
   * kettonek UGYANAZT a kanonikus cimet kell adnia -- kulonben epp a
   * duplikatumot hoznank letre, amit meg akarunk szuntetni.
   */
  it("az elso lap ket alakja ugyanoda mutat", () => {
    expect(storeCanonical("hu", 1)).toBe(storeCanonical("hu"))
  })

  it("hianyzo lapszamnal nem tesz oda ures parametert", () => {
    const cim = storeCanonical("hu", null)

    expect(cim).toBe("/hu/store")
    expect(cim).not.toContain("?")
  })
})
