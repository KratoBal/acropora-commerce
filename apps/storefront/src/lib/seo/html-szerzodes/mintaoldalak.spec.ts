import { describe, expect, it } from "vitest"

import { mintakAdatbol, type MintaTipus } from "./mintaoldalak"
import { SZABALYOK } from "./szabalyok"
import { VARHATO, varhato } from "./varhato"

/**
 * A MINTAOLDALAK VALASZTASA ES A VARHATO-PIROS LISTA (FE-8).
 *
 * MI PIROSIT: ha a valasztas nem determinisztikus vagy rossz lapot ad egy
 * tipusra; ha egy hianyzo minta nem mondja meg az okat; ha a varhato-lista egy
 * nem letezo szabalyra hivatkozik (akkor a sora soha nem kotne).
 */
const v = (id: string, x: Partial<Record<string, unknown>> = {}) => ({
  id,
  manage_inventory: true,
  inventory_quantity: 5,
  calculated_price: { calculated_amount: 1000 },
  ...x,
})
const TERMEKEK = [
  {
    id: "p3",
    handle: "c-elfogyott",
    title: "Cicc elfogyott",
    variants: [v("v3", { inventory_quantity: 0 })],
    categories: [{ id: "k-level" }],
    collection_id: "col1",
  },
  {
    id: "p1",
    handle: "a-gtin",
    title: "Aquaforest Amino",
    // a teszt boltban a GTIN-es termek is elfogyott (merve 2026-10-07): a valasztas
    // ne adja ugyanazt a lapot ket mintanak
    variants: [v("v1", { barcode: "5902026731010", inventory_quantity: 0 })],
    categories: [{ id: "k-level" }],
  },
  {
    id: "p2",
    handle: "b-sima",
    title: "Boyu szivattyú",
    variants: [
      v("v2a", { options: [{ value: "50 ml" }] }),
      // azonos aru, mas opcioju valtozat: a valasztas az opcion all, nem az aron
      v("v2b", { options: [{ value: "100 ml" }], sku: "B-2" }),
    ],
    categories: [{ id: "k-level" }],
  },
]
const KATEGORIAK = [
  { id: "k-felso", handle: "termekek", parent_category_id: null },
  { id: "k-level", handle: "amino", parent_category_id: "k-felso" },
  { id: "k-ures", handle: "ures", parent_category_id: "k-felso" },
]
const GYUJTEMENYEK = [
  { id: "col0", handle: "a-ures-marka" },
  { id: "col1", handle: "cicc" },
]

describe("a mintaoldalak választása", () => {
  const m = mintakAdatbol("hu", TERMEKEK, KATEGORIAK, GYUJTEMENYEK)
  const ut = (t: MintaTipus) => m.find((x) => x.tipus === t)?.ut

  it("minden típusra pontosan egy sor", () => {
    expect(m.map((x) => x.tipus).sort()).toEqual(
      [
        "facet",
        "kategoria-felso",
        "kategoria-lap2",
        "kategoria-level",
        "kereses",
        "kezdolap",
        "marka",
        "nem-letezo",
        "termek-elfogyott",
        "termek-gtin",
        "termek-gtin-nelkul",
        "termek-valtozatos",
      ].sort(),
    )
  })

  it("a termékek handle szerint, egymástól különbözve", () => {
    expect(ut("termek-gtin")).toBe("/hu/products/a-gtin")
    expect(ut("termek-gtin-nelkul")).toBe("/hu/products/b-sima")
    expect(ut("termek-elfogyott")).toBe("/hu/products/c-elfogyott")
  })

  it("a változat a nem alapértelmezett, eltérő opciójú", () => {
    const x = m.find((y) => y.tipus === "termek-valtozatos")!
    expect(x.ut).toBe("/hu/products/b-sima?v_id=v2b")
    expect(x.valtozat).toEqual({ id: "v2b", opciok: ["100 ml"] })
  })

  it("kategória, márka, facet, keresés a termékes elemekből", () => {
    expect(ut("kategoria-felso")).toBe("/hu/categories/termekek")
    expect(ut("kategoria-level")).toBe("/hu/categories/amino")
    expect(ut("marka")).toBe("/hu/collections/cicc")
    expect(ut("facet")).toBe("/hu/categories/amino?marka=col1")
    expect(ut("kereses")).toBe("/hu/store?q=Aquaforest")
  })

  it("a hiányzó minta az okát mondja", () => {
    const lap2 = m.find((x) => x.tipus === "kategoria-lap2")!
    expect(lap2.ut).toBeNull()
    expect(lap2.hianyzik).toMatch(/12/)
    const ures = mintakAdatbol(
      "hu",
      TERMEKEK.slice(0, 2),
      KATEGORIAK,
      GYUJTEMENYEK,
    )
    expect(ures.find((x) => x.tipus === "termek-valtozatos")).toMatchObject({
      ut: null,
      hianyzik: expect.stringContaining("változat"),
    })
  })
})

describe("a várható-piros lista", () => {
  it("minden sora létező szabályra szól", () => {
    for (const sor of VARHATO)
      expect(
        sor.szabaly === "v-id" || sor.szabaly in SZABALYOK,
        sor.szabaly,
      ).toBe(true)
  })

  it("a típus-szűkítés köt: a keresés noindexe várható, a 404-é nem", () => {
    expect(varhato("noindex", "kereses")?.gazda).toBe("FE-4")
    expect(varhato("noindex", "nem-letezo")).toBeNull()
    expect(varhato("alt", "termek-gtin")).toBeNull()
  })
})
