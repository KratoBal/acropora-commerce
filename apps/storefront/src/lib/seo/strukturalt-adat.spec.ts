import { describe, expect, it } from "vitest"

import {
  elerhetosegSchema,
  hasznaltE,
  jsonLdSzoveg,
  morzsaLd,
  szervezetLd,
  termekLd,
  webhelyLd,
  type TermekLdBemenet,
} from "./strukturalt-adat"

const ALAP = "https://kirakat.example.test"

/*
  A STRUKTURALT ADAT EPITOI (FE-2a). MI PIROSIT: SearchAction kerul a webhelyre
  (a kereses noindex); a morzsamenu sorszama vagy URL-je elcsuszik; a nem
  kosarba teheto termek InStock-ot allit; a hasznalt termek ujkent megy ki; egy
  `</script>` a nevben lezarja a blokkot; kitalalt mezo (gtin, mpn) kerul a
  termekre.
*/
describe("szervezet és webhely", () => {
  it("a webhelyen nincs SearchAction, és a szervezetre hivatkozik", () => {
    const w = webhelyLd(ALAP)
    expect(w["@type"]).toBe("WebSite")
    expect(JSON.stringify(w)).not.toContain("SearchAction")
    expect(w.publisher).toEqual({ "@id": szervezetLd(ALAP)["@id"] })
  })
})

describe("morzsamenü", () => {
  it("sorszám 1-től, az URL csak ahol van", () => {
    const m = morzsaLd([
      { nev: "Termékek", url: `${ALAP}/hu/categories/termekek` },
      { nev: "Hanna" },
    ])!
    expect(m.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Termékek",
        item: `${ALAP}/hu/categories/termekek`,
      },
      { "@type": "ListItem", position: 2, name: "Hanna" },
    ])
  })

  it("üres lánc: nincs blokk", () => {
    expect(morzsaLd([])).toBeNull()
  })
})

describe("elérhetőség és állapot", () => {
  it("csak a kosárba tehető termék InStock, utánrendelésre BackOrder", () => {
    expect(elerhetosegSchema("KAPHATO", false)).toBe(
      "https://schema.org/InStock",
    )
    expect(elerhetosegSchema("KAPHATO", true)).toBe(
      "https://schema.org/BackOrder",
    )
    expect(elerhetosegSchema("ELFOGYOTT", false)).toBe(
      "https://schema.org/OutOfStock",
    )
    expect(elerhetosegSchema("ELADVA", true)).toBe(
      "https://schema.org/OutOfStock",
    )
  })

  it("a használt ágban álló termék használt", () => {
    expect(hasznaltE(["Termékek", "Használt termékek OUTLET áron!"])).toBe(true)
    expect(hasznaltE(["Termékek", "Hanna fotométerek"])).toBe(false)
  })
})

describe("a termék", () => {
  const bemenet: TermekLdBemenet = {
    nev: "Hanna HI780-25",
    url: `${ALAP}/hu/products/hanna`,
    cikkszam: "HI780-25",
    marka: "Hanna",
    kepek: [`${ALAP}/static/k.webp`],
    ar: 10500,
    penznem: "HUF",
    elerhetoseg: "KAPHATO",
    utanrendeles: false,
    kategoriaNevek: ["Termékek"],
  }

  it("az ajánlat a lap értékeit viszi, kitalált mező nélkül", () => {
    const t = termekLd(bemenet)
    expect(t).toMatchObject({
      "@type": "Product",
      name: "Hanna HI780-25",
      sku: "HI780-25",
      brand: { "@type": "Brand", name: "Hanna" },
      offers: {
        "@type": "Offer",
        price: 10500,
        priceCurrency: "HUF",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    })
    for (const tilos of [
      "gtin",
      "gtin13",
      "mpn",
      "hasVariant",
      "shippingDetails",
    ])
      expect(JSON.stringify(t)).not.toContain(`"${tilos}"`)
  })

  it("cikkszám és márka nélkül a mező kimarad, nem üres", () => {
    const t = termekLd({ ...bemenet, cikkszam: null, marka: null })
    expect(t).not.toHaveProperty("sku")
    expect(t).not.toHaveProperty("brand")
  })
})

describe("a script tartalma", () => {
  it("egy </script> a névben nem zárja le a blokkot", () => {
    const szoveg = jsonLdSzoveg({ name: "a</script><b>" })
    expect(szoveg).not.toContain("</script>")
    expect(JSON.parse(szoveg)).toEqual({ name: "a</script><b>" })
  })
})
