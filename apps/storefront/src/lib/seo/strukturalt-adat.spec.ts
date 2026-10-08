import { describe, expect, it } from "vitest"

import {
  elerhetosegSchema,
  ervenyesGtin,
  hasznaltE,
  jsonLdSzoveg,
  morzsaLd,
  opcioTulajdonsag,
  szervezetLd,
  termekCsoportLd,
  termekLd,
  valtozatGtin,
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
    url: `${ALAP}/hu/termek/hanna`,
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

/*
  A GTIN ES A VALTOZATOS CSOPORT (FE-2b). MI PIROSIT: egy rossz ellenorzo-
  jegyu vagy rossz hosszu kod GTIN-nek szamit; az `ean` mogul a `upc` elore
  kerul; egy ismeretlen opcio kitalalt tulajdonsagot kap; a csoport sajat
  ajanlatot allit.
*/
describe("GTIN", () => {
  it("érvényes: 8, 12, 13 és 14 jegy helyes ellenőrző jeggyel", () => {
    for (const kod of [
      "96385074",
      "852464008968",
      "5060139356268",
      "4006381333931",
      "15060139356265",
    ])
      expect(ervenyesGtin(kod), kod).toBe(true)
  })

  it("érvénytelen: rossz ellenőrző jegy, rossz hossz, nem szám", () => {
    for (const kod of [
      "5060139356269",
      "506013935626",
      "1234567",
      "50601393562680",
      "50601393562a8",
      "",
    ])
      expect(ervenyesGtin(kod), kod).toBe(false)
  })

  it("a változat GTIN-je: ean, utána upc, az első érvényes; a barcode NEM forrás", () => {
    expect(valtozatGtin({ ean: "5060139356268", upc: "852464008968" })).toBe(
      "5060139356268",
    )
    expect(valtozatGtin({ ean: "5060139356269", upc: "852464008968" })).toBe(
      "852464008968",
    )
    expect(valtozatGtin({ ean: " 5060139356268 " })).toBe("5060139356268")
    // egy regi importbol jott bolti belso kod: formailag ervenyes, megsem GTIN-forras
    expect(ervenyesGtin("2000000000008")).toBe(true)
    expect(
      valtozatGtin({ barcode: "2000000000008" } as { ean?: null }),
    ).toBeNull()
    expect(valtozatGtin({ ean: null, upc: "" })).toBeNull()
  })
})

describe("termekCsoportLd", () => {
  const valtozat = (opciok: { nev: string; ertek: string }[], ar = 1990) => ({
    url: "https://bolt.test/hu/termek/so?v_id=v",
    opciok,
    cikkszam: "SO",
    gtin: null,
    kepek: [],
    ar,
    elerhetoseg: "KAPHATO" as const,
    utanrendeles: false,
  })
  const alap = {
    nev: "Só",
    url: "https://bolt.test/hu/termek/so",
    csoportAzonosito: "prod_so",
    kepek: ["https://bolt.test/k.webp"],
    penznem: "HUF",
    kategoriaNevek: ["Termékek"],
  }

  it("ismeretlen opció: nincs variesBy és nincs kitalált tulajdonság, a név viszi az értéket", () => {
    const ld = termekCsoportLd({
      ...alap,
      valtozatok: [valtozat([{ nev: "Kiszerelés", ertek: "1 kg" }])],
    })
    expect(ld.variesBy).toBeUndefined()
    expect(ld.offers).toBeUndefined()
    const v = (ld.hasVariant as Record<string, unknown>[])[0]!
    expect(v.name).toBe("Só (1 kg)")
    expect(Object.keys(v)).not.toContain("size")
    // a valtozatnak nincs sajat kepe: a termeke all rajta
    expect(v.image).toEqual(["https://bolt.test/k.webp"])
  })

  it("szín és méret: mindkettő a variesBy-ban, a változaton a saját értékével", () => {
    const ld = termekCsoportLd({
      ...alap,
      valtozatok: [
        valtozat([
          { nev: "Szín", ertek: "Kék" },
          { nev: "Méret", ertek: "M" },
        ]),
      ],
    })
    expect(ld.variesBy).toEqual([
      "https://schema.org/color",
      "https://schema.org/size",
    ])
    const v = (ld.hasVariant as Record<string, unknown>[])[0]!
    expect([v.color, v.size]).toEqual(["Kék", "M"])
  })

  it("opcioTulajdonsag kis- és nagybetű, ékezet nélkül is", () => {
    expect(opcioTulajdonsag("MÉRET")).toBe("size")
    expect(opcioTulajdonsag("meret")).toBe("size")
    expect(opcioTulajdonsag("Kiszerelés")).toBeNull()
  })
})
