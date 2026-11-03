import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  usePathname: () => "/hu/marka/aquamedic",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const adat = vi.hoisted(() => ({ listProductsWithSort: vi.fn() }))
vi.mock("@lib/data/products", () => adat)
const katAdat = vi.hoisted(() => ({ listCategories: vi.fn() }))
vi.mock("@lib/data/categories", () => katAdat)
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import CollectionTemplate from "./index"

const MARKA = { id: "pcol_aqua", title: "Aqua Medic", handle: "aqua-medic" }

const ELO = {
  id: "p_elo",
  handle: "p_elo",
  title: "Élő korall",
  variants: [],
  categories: [{ id: "k", name: "Korallok", mpath: "k" }],
}
const MUSZAKI = {
  id: "p_musz",
  handle: "p_musz",
  title: "Műszaki termék",
  variants: [],
  categories: [{ id: "v", name: "Világítás", mpath: "v" }],
}

const lap = async (props: Record<string, unknown> = {}) =>
  render(
    await CollectionTemplate({
      collection: MARKA as never,
      countryCode: "hu",
      ...props,
    }),
  )

beforeEach(() => {
  katAdat.listCategories.mockResolvedValue([])
  adat.listProductsWithSort.mockResolvedValue({
    response: { products: [MUSZAKI, ELO], count: 40 },
    nextPage: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
})

/**
 * THE BRAND (COLLECTION) PAGE ON THE SHARED LIST PAGE. WHAT TURNS IT RED: the
 * list asking for something else than this brand's products, 18 at a time; the
 * crumb losing the "Brands" step; a filter column or an empty chip list on a
 * page with nothing to filter by; a live animal on the technical card; the
 * "load more" link on the last page.
 */
describe("a márka (gyűjtemény) oldal a közös lista-lapon", () => {
  it("a cím a márka neve, a morzsa a Márkák lépéssel indul", async () => {
    await lap()
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "Aqua Medic",
    )
    const morzsa = screen.getByRole("navigation", { name: "Morzsamenü" })
    const link = within(morzsa).getByRole("link")
    expect(link.textContent).toBe("Márkák")
    expect(link.getAttribute("href")).toBe("/hu/marka")
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Aqua Medic",
    )
  })

  it("a márka termékeit kéri, 18-asával, a kategóriákkal", async () => {
    await lap({ page: "2" })
    const hivas = adat.listProductsWithSort.mock.calls[0][0]
    expect(hivas.page).toBe(2)
    expect(hivas.queryParams.limit).toBe(18)
    expect(hivas.queryParams.collection_id).toEqual(["pcol_aqua"])
    expect(hivas.queryParams.fields).toContain("*categories")
  })

  it("nincs szűrő-oszlop és nincs üres gyors sáv, a rendezés viszont van", async () => {
    await lap()
    expect(screen.queryByTestId("kategoria-szurok")).toBeNull()
    expect(screen.queryByTestId("gyors-kategoriak")).toBeNull()
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 termék",
    )
    expect(screen.getByRole("combobox")).toBeTruthy()
  })

  it("az élő állat az élő állat kártyáját kapja, a műszaki a műszakit", async () => {
    await lap()
    const kartyak = within(
      screen.getByTestId("category-products-list"),
    ).getAllByRole("listitem")
    expect(
      kartyak[0].querySelector("[data-testid='commerce-termek-kartya']"),
    ).not.toBeNull()
    expect(
      kartyak[1].querySelector(
        "[data-testid='category-product-card-livestock']",
      ),
    ).not.toBeNull()
  })

  it("a további termékek gomb a következő lapra visz, az utolsón nincs", async () => {
    await lap({ sortBy: "price_asc" })
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?sortBy=price_asc&page=2")
    cleanup()

    adat.listProductsWithSort.mockResolvedValue({
      response: { products: [MUSZAKI], count: 40 },
      nextPage: null,
    })
    await lap({ page: "3" })
    expect(screen.queryByTestId("category-more-products")).toBeNull()
  })

  it("üres márkánál a márkás mondat áll, és az angol szegmensen angol", async () => {
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: [], count: 0 },
      nextPage: null,
    })
    await lap()
    expect(screen.getByTestId("category-products-empty").textContent).toBe(
      "Ennél a márkánál még nincs megjeleníthető termék.",
    )
    cleanup()
    nav.countryCode = "en-hu"
    await lap({ countryCode: "en-hu" })
    expect(screen.getByTestId("category-products-empty").textContent).toBe(
      "This brand has no products to show yet.",
    )
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole(
        "link",
      ).textContent,
    ).toBe("Brands")
  })
})
