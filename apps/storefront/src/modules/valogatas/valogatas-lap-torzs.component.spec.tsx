import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({
  countryCode: "hu",
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  usePathname: () => "/hu/valogatas/akcios-led",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  notFound: nav.notFound,
}))

const adat = vi.hoisted(() => ({ listProducts: vi.fn() }))
vi.mock("@lib/data/products", () => adat)
const katAdat = vi.hoisted(() => ({ listCategories: vi.fn() }))
vi.mock("@lib/data/categories", () => katAdat)
vi.mock("@lib/data/regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_hu" })),
}))
const valAdat = vi.hoisted(() => ({
  valogatasHandleAlapjan: vi.fn(),
  valogatasTermekAzonositok: vi.fn(),
}))
vi.mock("@lib/data/valogatas", () => valAdat)
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import { valogatasLapTorzs } from "./valogatas-lap-torzs"

const VALOGATAS = {
  handle: "akcios-led",
  title: "Akciós LED lámpák",
  seo_title: null,
  meta_description: null,
  intro: "Első sor.\nMásodik sor.",
  filter: { category_ids: ["c1"], os_brand_ids: [] },
  updated_at: null,
}

/** 40 ids in the selection's own order. */
const AZONOSITOK = Array.from({ length: 40 }, (_, i) => `p${i}`)

const termek = (id: string, gyoker = "Világítás") => ({
  id,
  handle: id,
  title: `Termék ${id}`,
  variants: [],
  categories: [{ id: gyoker, name: gyoker, mpath: gyoker }],
})

const params = { handle: "akcios-led", countryCode: "hu" }
const lap = async (keres: Record<string, string> = {}, p = params) =>
  render(await valogatasLapTorzs(p, keres))

beforeEach(() => {
  katAdat.listCategories.mockResolvedValue([])
  valAdat.valogatasHandleAlapjan.mockResolvedValue(VALOGATAS)
  valAdat.valogatasTermekAzonositok.mockResolvedValue(AZONOSITOK)
  // the shop answers in ANOTHER order than asked: the page must keep ours
  adat.listProducts.mockImplementation(async ({ queryParams }) => ({
    response: {
      products: [...queryParams.id].reverse().map((id: string) => termek(id)),
      count: queryParams.id.length,
    },
    nextPage: null,
  }))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
})

/**
 * THE SELECTION PAGE ON THE SHARED LIST PAGE. WHAT TURNS IT RED: the page
 * taking the shop's order instead of the selection's; more or fewer than 18 a
 * page; a sort select or a filter column on a list with a fixed order; the
 * intro losing its line breaks; the "load more" link on the last page; an
 * invalid or missing selection not being a 404.
 */
describe("a válogatás oldal a közös lista-lapon", () => {
  it("a cím és a bevezető a válogatásé, a bevezető megtartja a sortörést", async () => {
    await lap()
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "Akciós LED lámpák",
    )
    const bevezeto = screen.getByText(/Első sor/)
    expect(bevezeto.className).toContain("whitespace-pre-line")
    expect(
      screen
        .getByRole("navigation", { name: "Morzsamenü" })
        .querySelector("[aria-current='page']")?.textContent,
    ).toBe("Akciós LED lámpák")
  })

  it("az első 18 azonosítót kéri, és a válogatás sorrendjét tartja", async () => {
    await lap()
    expect(adat.listProducts.mock.calls[0][0].queryParams.id).toEqual(
      AZONOSITOK.slice(0, 18),
    )
    const cimek = within(screen.getByTestId("category-products-list"))
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
    expect(cimek).toEqual(AZONOSITOK.slice(0, 18).map((id) => `Termék ${id}`))
  })

  it("nincs rendezés és nincs szűrő-oszlop, a darabszám az egész válogatásé", async () => {
    await lap()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByTestId("kategoria-szurok")).toBeNull()
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 termék",
    )
  })

  it("a további termékek gomb a következő lapra visz, az utolsón nincs", async () => {
    await lap()
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?page=2")
    cleanup()
    await lap({ page: "3" })
    expect(adat.listProducts.mock.calls.at(-1)![0].queryParams.id).toEqual(
      AZONOSITOK.slice(36, 40),
    )
    expect(screen.queryByTestId("category-more-products")).toBeNull()
  })

  it("a nem létező lapszám és az érvénytelen válogatás 404", async () => {
    await expect(lap({ page: "4" })).rejects.toThrow("NEXT_NOT_FOUND")
    valAdat.valogatasHandleAlapjan.mockResolvedValue({
      ...VALOGATAS,
      filter: { category_ids: [], os_brand_ids: [] },
    })
    await expect(lap()).rejects.toThrow("NEXT_NOT_FOUND")
    valAdat.valogatasHandleAlapjan.mockResolvedValue(null)
    await expect(lap()).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("üres válogatásnál a válogatásos mondat áll, angolul angol", async () => {
    valAdat.valogatasTermekAzonositok.mockResolvedValue([])
    await lap()
    expect(screen.getByTestId("category-products-empty").textContent).toBe(
      "Ebben a válogatásban most nincs termék.",
    )
    cleanup()
    nav.countryCode = "en-hu"
    await lap({}, { handle: "akcios-led", countryCode: "en-hu" })
    expect(screen.getByTestId("category-products-empty").textContent).toBe(
      "There are no products in this selection right now.",
    )
  })

  it("az élő állat az élő állat kártyáját kapja", async () => {
    adat.listProducts.mockImplementation(async ({ queryParams }) => ({
      response: {
        products: queryParams.id.map((id: string, i: number) =>
          termek(id, i === 0 ? "Korallok" : "Világítás"),
        ),
        count: queryParams.id.length,
      },
      nextPage: null,
    }))
    await lap()
    const kartyak = within(
      screen.getByTestId("category-products-list"),
    ).getAllByRole("listitem")
    expect(
      kartyak[0].querySelector(
        "[data-testid='category-product-card-livestock']",
      ),
    ).not.toBeNull()
    expect(
      kartyak[1].querySelector("[data-testid='commerce-termek-kartya']"),
    ).not.toBeNull()
  })

  it("hibás katalógusnál a lap nem tör, a műszaki kártya marad", async () => {
    katAdat.listCategories.mockRejectedValue(new Error("hálózati hiba"))
    await lap()
    const kartyak = within(
      screen.getByTestId("category-products-list"),
    ).getAllByRole("listitem")
    expect(kartyak).toHaveLength(18)
    expect(
      kartyak[0].querySelector("[data-testid='commerce-termek-kartya']"),
    ).not.toBeNull()
  })
})
