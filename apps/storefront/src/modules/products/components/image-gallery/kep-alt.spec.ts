import { describe, expect, it } from "vitest"

import { galeriaAlt, kepAlt, kepAltok } from "./kep-alt"

/**
 * A GALERIA ALT-JA A TERMEK NEVE (FE-1, az 5. pont).
 *
 * MI PIROSIT: ha generikus szo kerul vissza (`Termékfotó`), ha az elso kep is
 * sorszamot kap, vagy ha nev nelkul nem ures.
 */
describe("a galéria képének alt-ja", () => {
  it("a termék neve, a második képtől sorszámmal", () => {
    expect(galeriaAlt("Vitalis LPS Coral Pellets", 0, 3)).toBe(
      "Vitalis LPS Coral Pellets",
    )
    expect(galeriaAlt("Vitalis LPS Coral Pellets", 1, 3)).toBe(
      "Vitalis LPS Coral Pellets (2. kép)",
    )
    expect(galeriaAlt(" Hanna ", 0, 1)).toBe("Hanna")
  })

  it("név nélkül üres, nem generikus", () => {
    expect(galeriaAlt(null, 0, 1)).toBe("")
    expect(galeriaAlt("  ", 2, 3)).toBe("")
  })
})

/**
 * A KEP SAJAT ALT-JA A METAADATBOL (SEO P0 PR 9).
 *
 * MI PIROSIT: ha a sajat alt nem ER el a kephez (rossz kulcs, rossz URL), ha a
 * generikus alt atmegy, ha rossz alaku metaadat hibat dob, vagy ha a sajat alt
 * nelkuli kep nem a termek nevere esik vissza.
 */
describe("a kép saját alt-ja", () => {
  const metadata = {
    acropora_images: JSON.stringify([
      { url: "https://m/1.jpg", alt: " Pumpa elölről ", title: null },
      { url: "https://m/2.jpg", alt: "Termékfotó", title: null },
      { url: "https://m/3.jpg", alt: null, title: "Cím" },
    ]),
  }

  it("URL szerint, levágva; a generikus és az üres kimarad", () => {
    expect(kepAltok(metadata)).toEqual({ "https://m/1.jpg": "Pumpa elölről" })
  })

  it("rossz alakú metaadat nem dob, csak nem ad altot", () => {
    expect(kepAltok(null)).toEqual({})
    expect(kepAltok({ acropora_images: "{nem json" })).toEqual({})
    expect(kepAltok({ acropora_images: JSON.stringify({ url: "x" }) })).toEqual(
      {},
    )
    expect(kepAltok({ acropora_images: [{ url: "x", alt: "y" }] })).toEqual({})
  })

  it("a saját alt nyer, nélküle a termék neve a sorszámmal", () => {
    const altok = kepAltok(metadata)
    expect(kepAlt(altok, "https://m/1.jpg", "Pumpa", 0, 3)).toBe(
      "Pumpa elölről",
    )
    expect(kepAlt(altok, "https://m/2.jpg", "Pumpa", 1, 3)).toBe(
      "Pumpa (2. kép)",
    )
    expect(kepAlt(undefined, "https://m/1.jpg", "Pumpa", 0, 1)).toBe("Pumpa")
  })
})
