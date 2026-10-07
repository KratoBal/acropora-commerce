// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@lib/data/categories", () => ({ listCategories: vi.fn() }))
vi.mock("@lib/data/product-knowledge", () => ({ termekTudas: vi.fn() }))
vi.mock("@lib/data/products", () => ({ listProducts: vi.fn() }))
vi.mock("@lib/data/regions", () => ({ getRegion: vi.fn() }))
vi.mock("@modules/products/templates", () => ({ default: () => null }))

import { strukturaltAdat } from "./termek-lap-torzs"

/*
  A TERMEKLAP STRUKTURALT ADATA (FE-2a). A valodi `getProductPrice`,
  `besorolasUt`, `cikkszam` es elerhetoseg-fuggvenyek futnak, csak az adat-
  lekeresek mockoltak. MI PIROSIT: tobbvaltozatos termek Product blokkot kap
  ProductGroup helyett, vagy a valtozatai nem a sajat arukat viszik (FE-2b);
  egy ervenytelen vagy hianyzo GTIN megis a blokkba kerul;
  ar nelkuli ajanlat keletkezik; az egyedi, keszleten nem levo darab
  "elerheto"-nek latszik; a morzsamenu mas lancot ad, mint a lapon latszo.
*/
const KATEGORIAK = [
  {
    id: "pcat_gy",
    name: "Termékek",
    handle: "termékek",
    parent_category_id: null,
  },
  {
    id: "pcat_h",
    name: "Hanna fotométerek - Termékek",
    handle: "hanna",
    parent_category_id: "pcat_gy",
  },
]

const valtozat = (felul: Record<string, unknown> = {}) => ({
  id: "variant_1",
  sku: "HI780-25",
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 3,
  calculated_price: {
    calculated_amount: 10500,
    original_amount: 10500,
    currency_code: "huf",
    calculated_price: { price_list_type: null },
  },
  ...felul,
})

const termek = (felul: Record<string, unknown> = {}) =>
  ({
    id: "prod_1",
    title: "Hanna HI780-25",
    handle: "hanna-hi780-25",
    categories: [{ id: "pcat_h" }],
    collection: { title: "Hanna" },
    metadata: {},
    variants: [valtozat()],
    ...felul,
  }) as never

const PARAMS = { countryCode: "hu", handle: "hanna-hi780-25" }
const KEP = [{ id: "img_1", url: "https://bolt.test/static/1-k.webp" }] as never

describe("a terméklap strukturált adata", () => {
  it("egyváltozatos: Product a lap árával, HUF, InStock, és a morzsamenü lánca", () => {
    const { termek: t, morzsa } = strukturaltAdat(
      termek(),
      KATEGORIAK,
      KEP,
      PARAMS,
    )
    expect(t).toMatchObject({
      name: "Hanna HI780-25",
      sku: "HI780-25",
      brand: { name: "Hanna" },
      image: ["https://bolt.test/static/1-k.webp"],
      offers: {
        price: 10500,
        priceCurrency: "HUF",
        availability: "https://schema.org/InStock",
      },
    })
    const nevek = (morzsa!.itemListElement as { name: string }[]).map(
      (e) => e.name,
    )
    expect(nevek).toEqual(["Termékek", "Hanna fotométerek", "Hanna HI780-25"])
    // az ekezetes handle kodolt URL-kent megy ki
    expect((morzsa!.itemListElement as { item?: string }[])[0].item).toMatch(
      /\/hu\/categories\/term%C3%A9kek$/,
    )
  })

  it("egyváltozatos, érvényes EAN-nel: gtin13; érvénytelennel vagy nélküle a mező kimarad", () => {
    const vele = strukturaltAdat(
      termek({ variants: [valtozat({ ean: "5060139356268" })] }),
      KATEGORIAK,
      KEP,
      PARAMS,
    ).termek as Record<string, unknown>
    expect(vele.gtin13).toBe("5060139356268")
    for (const ean of [null, "", "5060139356269"]) {
      const nelkule = strukturaltAdat(
        termek({ variants: [valtozat({ ean })] }),
        KATEGORIAK,
        KEP,
        PARAMS,
      ).termek as Record<string, unknown>
      expect(Object.keys(nelkule).filter((k) => k.startsWith("gtin"))).toEqual(
        [],
      )
    }
  })

  it("többváltozatos termék: ProductGroup, a változatok a saját árukkal, cikkszámukkal és GTIN-jükkel", () => {
    const { termek: t, morzsa } = strukturaltAdat(
      termek({
        options: [{ id: "opt_m", title: "Méret" }],
        variants: [
          valtozat({
            id: "variant_1",
            sku: "SO-1KG",
            ean: "5060139356268",
            options: [{ option_id: "opt_m", value: "1 kg" }],
          }),
          valtozat({
            id: "variant_2",
            sku: "SO-5KG",
            upc: "852464008968",
            inventory_quantity: 0,
            options: [{ option_id: "opt_m", value: "5 kg" }],
            calculated_price: {
              calculated_amount: 39900,
              original_amount: 39900,
              currency_code: "huf",
              calculated_price: { price_list_type: null },
            },
          }),
        ],
      }),
      KATEGORIAK,
      KEP,
      PARAMS,
    )
    expect(morzsa).not.toBeNull()
    const csoport = t as Record<string, unknown>
    expect(csoport["@type"]).toBe("ProductGroup")
    expect(csoport.offers).toBeUndefined()
    expect(csoport.productGroupID).toBe("prod_1")
    expect(csoport.variesBy).toEqual(["https://schema.org/size"])
    const v = csoport.hasVariant as Record<string, unknown>[]
    expect(v.map((x) => x.name)).toEqual([
      "Hanna HI780-25 (1 kg)",
      "Hanna HI780-25 (5 kg)",
    ])
    expect(v.map((x) => x.sku)).toEqual(["SO-1KG", "SO-5KG"])
    expect(v.map((x) => x.size)).toEqual(["1 kg", "5 kg"])
    expect(v[0]!.gtin13).toBe("5060139356268")
    expect(v[1]!.gtin12).toBe("852464008968")
    expect(v.map((x) => (x.offers as { price: number }).price)).toEqual([
      10500, 39900,
    ])
    expect(
      v.map((x) => (x.offers as { availability: string }).availability),
    ).toEqual(["https://schema.org/InStock", "https://schema.org/OutOfStock"])
    expect(String(v[1]!.url)).toMatch(
      /\/hu\/products\/hanna-hi780-25\?v_id=variant_2$/,
    )
  })

  it("a csoportból az ár nélküli változat kimarad; ha egy sem marad, nincs blokk", () => {
    const ketto = (masodikAr: unknown) =>
      strukturaltAdat(
        termek({
          variants: [
            valtozat({ calculated_price: null }),
            valtozat({ id: "variant_2", calculated_price: masodikAr }),
          ],
        }),
        KATEGORIAK,
        KEP,
        PARAMS,
      ).termek as Record<string, unknown> | null
    const egy = ketto(valtozat().calculated_price)
    expect((egy!.hasVariant as unknown[]).length).toBe(1)
    expect(ketto(null)).toBeNull()
  })

  it("ár nélkül nincs ajánlat", () => {
    const { termek: t } = strukturaltAdat(
      termek({ variants: [valtozat({ calculated_price: null })] }),
      KATEGORIAK,
      KEP,
      PARAMS,
    )
    expect(t).toBeNull()
  })

  it("készlet nélküli egyedi darab: OutOfStock, utánrendelhető: BackOrder", () => {
    const elfogyott = strukturaltAdat(
      termek({
        metadata: { unique_piece: true },
        variants: [valtozat({ inventory_quantity: 0 })],
      }),
      KATEGORIAK,
      KEP,
      PARAMS,
    ).termek as { offers: { availability: string } }
    expect(elfogyott.offers.availability).toBe("https://schema.org/OutOfStock")

    const utan = strukturaltAdat(
      termek({
        variants: [valtozat({ inventory_quantity: 0, allow_backorder: true })],
      }),
      KATEGORIAK,
      KEP,
      PARAMS,
    ).termek as { offers: { availability: string } }
    expect(utan.offers.availability).toBe("https://schema.org/BackOrder")
  })
})
