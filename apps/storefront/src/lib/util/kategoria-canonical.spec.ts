import { describe, expect, it } from "vitest"

import { kategoriaCanonical } from "./kategoria-canonical"

/**
 * A KANONIKUS CIM AZ ELOTAGON MULIK, NEM A RELATIVSAGON.
 *
 * A `metadataBase` be van allitva, tehat a Next.js a relativ erteket feloldja.
 * A regi alak (`params.category.join("/")`) EPP EZERT adott 404-et: feloldva a
 * gyokerre mutatott, nem a `/{countryCode}/categories/` ala.
 */
describe("kategoria kanonikus cime", () => {
  it("a lap valodi utjat adja, orszagkoddal es a categories szegmenssel", () => {
    expect(kategoriaCanonical("hu", ["koralltapok"])).toBe(
      "/hu/categories/koralltapok",
    )
  })

  it("tobb szintu kategoriat vegig visz", () => {
    expect(kategoriaCanonical("hu", ["termekek", "koralltapok"])).toBe(
      "/hu/categories/termekek/koralltapok",
    )
  })

  /**
   * A REGI ALAK POZITIV KONTROLLJA: ez az az ertek, amit a hiba adott. Ha a
   * fuggveny valaha ide esne vissza, ez az allitas mondja meg, hogy PONTOSAN a
   * regi hibat hoztuk vissza -- nem csak azt, hogy "mas".
   */
  it("NEM a puszta kategoria-utat adja vissza (ez volt a hiba)", () => {
    expect(kategoriaCanonical("hu", ["koralltapok"])).not.toBe("koralltapok")
  })

  /**
   * A SZEGMENSEK KODOLVA MARADNAK. A `params` mar kodolt alakot ad
   * (`decode-handle-param.ts` merese), es egy URL-ben az a helyes. Aki ide
   * dekodolast tesz, a 2026-09-07-i ketszeres-kodolas hibat hozza vissza.
   */
  it("a mar kodolt szegmenst NEM dekodolja es nem kodolja ujra", () => {
    expect(kategoriaCanonical("hu", ["term%C3%A9kek"])).toBe(
      "/hu/categories/term%C3%A9kek",
    )
  })

  it("mas orszagkoddal is a helyes elotagot adja", () => {
    expect(kategoriaCanonical("en", ["corals"])).toBe("/en/categories/corals")
  })
})
