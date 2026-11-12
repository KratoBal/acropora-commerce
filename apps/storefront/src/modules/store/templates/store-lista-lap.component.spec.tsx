import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  usePathname: () => "/hu/store",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const adat = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listProductsWithSort: vi.fn(),
}))
vi.mock("@lib/data/products", () => adat)
const katAdat = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listNonEmptyRootCategories: vi.fn(),
}))
vi.mock("@lib/data/categories", () => katAdat)
vi.mock("@lib/data/regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_hu" })),
}))
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import { LAP_MERET } from "@modules/categories/templates/commerce/lista-lap"

import StoreListaLap from "./store-lista-lap"

const gyoker = (id: string, name: string) => ({ id, name, handle: id }) as never

/** One purchasable variant with a price, so both cards draw their price. */
const VALTOZAT = [
  {
    id: "v1",
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 3,
    calculated_price: {
      calculated_amount: 45000,
      original_amount: 45000,
      currency_code: "huf",
      calculated_price: { price_list_type: "default" },
    },
  },
]

const ELO = {
  id: "p_elo",
  handle: "p_elo",
  title: "Élő korall",
  variants: VALTOZAT,
  categories: [{ id: "k", name: "Korallok", mpath: "k" }],
}
const MUSZAKI = {
  id: "p_musz",
  handle: "p_musz",
  title: "Műszaki termék",
  variants: VALTOZAT,
  categories: [{ id: "v", name: "Világítás", mpath: "v" }],
}
/** Only the leaf came with the product: the root is resolved from the catalogue. */
const ELO_LEVEL = {
  id: "p_level",
  handle: "p_level",
  title: "Garnélapár",
  variants: [],
  categories: [
    { id: "g1", name: "Rákok", mpath: "g.g1", parent_category_id: "g" },
  ],
}

const lap = async (props: Record<string, unknown> = {}) =>
  render(
    await StoreListaLap({
      countryCode: "hu",
      page: 1,
      ...props,
    }),
  )

beforeEach(() => {
  katAdat.listNonEmptyRootCategories.mockResolvedValue({
    gyokerek: [gyoker("k", "Korallok"), gyoker("v", "Termékek")],
    nevek: new Map([["v", "Termékek"]]),
    szamok: new Map([
      ["k", 8],
      ["v", 1278],
    ]),
  })
  katAdat.listCategories.mockResolvedValue([
    { id: "g", name: "Gerinctelenek", parent_category_id: null },
    { id: "g1", name: "Rákok", parent_category_id: "g" },
  ])
  adat.listProducts.mockImplementation(async ({ pageParam }) => {
    // the brand count: two pages of 100 and 50 products
    const oldal = pageParam ?? 1
    return {
      response: {
        products: Array.from({ length: oldal === 1 ? 100 : 50 }, (_, i) => ({
          id: `m${oldal}-${i}`,
          collection:
            i % 2 === 0
              ? { id: "pcol_ati", title: "ATI" }
              : { id: "pcol_dd", title: "D-D" },
        })),
        count: 150,
      },
      nextPage: null,
    }
  })
  adat.listProductsWithSort.mockResolvedValue({
    response: { products: [ELO, MUSZAKI, ELO_LEVEL], count: 40 },
    nextPage: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
})

/**
 * THE ALL-PRODUCTS LIST (`/store`). WHAT TURNS IT RED: the title or the crumb
 * dropping out of the shared frame; the chips not being the shop's roots with
 * the header's counts; the list not asking for 18 products with the categories
 * (the card choice reads them); a live animal getting the technical card (a
 * quick add to cart on an animal); the brand count looking inside one category;
 * the "load more" link on the last page, or missing before it.
 */
describe("a Minden termék lista a közös lista-lapon", () => {
  /*
    A MASIK IRANY (barracuda, commerce #748): a kategoria oldal kapja a kezdolap szelet es betujet
    (`kezdolapStilus`), a Minden termek lista NEM (acrobot 49265: a 10-26-i szo a fejlecre es a
    lablecre szolt). MI PIROSIT: ha a kozos keret a kapcsolo nelkul is a 64 pixeles szelet vagy
    a serifet adja, vagyis a kapcsolo nem szur.
  */
  it("a kezdőlapi szél és betű nincs rajta: a régi 80/56 pixeles szél és a világos cím marad", async () => {
    const { container } = await lap()
    const sorok = Array.from(
      container.querySelectorAll("[class*='small:px-']"),
    ).map((e) => e.className)
    expect(sorok.length).toBeGreaterThanOrEqual(4)
    for (const osztaly of sorok) {
      expect(osztaly).toMatch(/small:px-\[(56|80)px\]/)
      expect(osztaly).not.toContain("small:px-16")
    }
    const cim = screen.getByTestId("category-page-title").className
    expect(cim).toContain("font-light")
    expect(cim).not.toContain("font-kiemelt")
  })

  it("a cím és a morzsamenü a közös keretben áll", async () => {
    await lap()
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "Minden termék",
    )
    const morzsa = screen.getByRole("navigation", { name: "Morzsamenü" })
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Minden termék",
    )
    expect(within(morzsa).queryAllByRole("link")).toHaveLength(0)
  })

  it("a gyors sáv az Összes mellett a bolt gyökereit adja, a fejléc számaival", async () => {
    await lap()
    const sav = screen.getByTestId("gyors-kategoriak")
    expect(sav.textContent).toContain("Összes")
    const linkek = within(sav)
      .getAllByRole("link")
      .map((a) => [a.textContent, a.getAttribute("href")])
    expect(linkek).toEqual([
      ["Korallok", "/hu/categories/k"],
      ["Termékek", "/hu/categories/v"],
    ])
    const szuro = screen.getByTestId("szuro-kategoriak")
    expect(szuro.textContent).toContain("8")
    expect(szuro.textContent).toContain("1278")
  })

  it("18-asával kér, a kategóriákkal, és márka nélkül nem szűr gyűjteményre", async () => {
    await lap({ page: 2 })
    const hivas = adat.listProductsWithSort.mock.calls[0][0]
    expect(hivas.page).toBe(2)
    expect(hivas.queryParams.limit).toBe(LAP_MERET)
    expect(hivas.queryParams.fields).toContain("*categories")
    expect(hivas.queryParams.fields).toContain("*collection")
    expect(hivas.queryParams.collection_id).toBeUndefined()
  })

  it("a kiválasztott márka gyűjtemény-szűrésként megy át, és aktív szűrőként látszik", async () => {
    await lap({ markak: ["pcol_ati"] })
    expect(
      adat.listProductsWithSort.mock.calls[0][0].queryParams.collection_id,
    ).toEqual(["pcol_ati"])
    const aktiv = screen.getByTestId("aktiv-szurok")
    expect(aktiv.textContent).toContain("ATI")
  })

  it("a márkákat az egész boltra számolja, nem egy kategóriára", async () => {
    await lap()
    const markaHivasok = adat.listProducts.mock.calls.map(([arg]) => arg)
    expect(markaHivasok).toHaveLength(2)
    for (const arg of markaHivasok) {
      expect(arg.queryParams.category_id).toBeUndefined()
    }
    expect(screen.getByTestId("szuro-markak").textContent).toContain("ATI")
  })

  it("az élő állat az élő állat kártyáját kapja, a műszaki a műszakit", async () => {
    await lap()
    const lista = screen.getByTestId("category-products-list")
    const kartyak = within(lista).getAllByRole("listitem")
    expect(kartyak).toHaveLength(3)
    const eloKartya = (li: HTMLElement) =>
      li.querySelector("[data-testid='category-product-card-livestock']")
    const muszakiKartya = (li: HTMLElement) =>
      li.querySelector("[data-testid='commerce-termek-kartya']")
    // the live animal (root on the product) and the leaf (root from the catalogue)
    expect(eloKartya(kartyak[0])).not.toBeNull()
    expect(muszakiKartya(kartyak[0])).toBeNull()
    expect(eloKartya(kartyak[2])).not.toBeNull()
    expect(muszakiKartya(kartyak[2])).toBeNull()
    // the technical product keeps the technical card
    expect(muszakiKartya(kartyak[1])).not.toBeNull()
    expect(eloKartya(kartyak[1])).toBeNull()
  })

  it("a vegyes listán az élő állat kártyája ugyanakkora betűvel áll, mint a műszaki", async () => {
    await lap()
    const lista = screen.getByTestId("category-products-list")
    const elo = lista.querySelector(
      "[data-testid='category-product-card-livestock']",
    ) as HTMLElement
    const muszaki = lista.querySelector(
      "[data-testid='commerce-termek-kartya']",
    ) as HTMLElement
    const cim = (kartya: HTMLElement) => kartya.querySelector("h2")!.className
    const ar = (kartya: HTMLElement) =>
      kartya.querySelector("[data-testid='kartya-ar']")!.className
    // the same title and price sizes, at every width (no compact `small:` pair)
    expect(cim(elo)).toContain("text-[18px]")
    expect(cim(muszaki)).toContain("text-[18px]")
    expect(cim(elo)).not.toContain("text-[14px]")
    expect(ar(elo)).toContain("text-[24px]")
    expect(ar(muszaki)).toContain("text-[24px]")
  })

  it("van további oldal: a gomb a következő lapra visz, az utolsón nincs", async () => {
    await lap({ page: 1 })
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?page=2")
    cleanup()

    // 40 products at 18 per page: the third page is the last
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: [MUSZAKI], count: 40 },
      nextPage: null,
    })
    await lap({ page: 3 })
    expect(screen.queryByTestId("category-more-products")).toBeNull()
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "37–40 / 40 termék",
    )
  })

  it("a rendezés a címben marad a következő lapra, és a szűrő-törlés megjelenik", async () => {
    await lap({ sortBy: "price_asc" })
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?sortBy=price_asc&page=2")
    expect(
      within(screen.getByTestId("kategoria-szurok"))
        .getByText("Törlés")
        .getAttribute("href"),
    ).toBe("/hu/store")
  })

  it("üres lista esetén az üres-lista mondat áll, nem a kategóriás", async () => {
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: [], count: 0 },
      nextPage: null,
    })
    await lap()
    expect(screen.getByTestId("category-products-empty").textContent).toBe(
      "Még nincs megjeleníthető termék.",
    )
  })

  it("az angol szegmensen a cím és a kártyák angolul állnak", async () => {
    nav.countryCode = "en-hu"
    await lap({ countryCode: "en-hu" })
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "All products",
    )
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 products",
    )
  })

  it("hibás katalógusnál a lista nem tör, a levél-kategória a műszaki kártyát kapja", async () => {
    katAdat.listCategories.mockRejectedValue(new Error("hálózati hiba"))
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: [ELO_LEVEL], count: 1 },
      nextPage: null,
    })
    await lap()
    const kartya = within(
      screen.getByTestId("category-products-list"),
    ).getAllByRole("listitem")[0]
    expect(
      kartya.querySelector("[data-testid='commerce-termek-kartya']"),
    ).not.toBeNull()
  })
})
