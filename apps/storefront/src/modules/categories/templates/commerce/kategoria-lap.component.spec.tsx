import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/categories/termekek",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const adat = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listProductsWithSort: vi.fn(),
}))
vi.mock("@lib/data/products", () => adat)

import CommerceKategoriaLap, { LAP_MERET, kovetkezoLap } from "./kategoria-lap"

const kat = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ id, name, handle: id, ...extra }) as never

const KATEGORIA = kat("termekek", "Termékek", {
  parent_category: kat("gyoker", "Bolt"),
  category_children: [
    kat("vilagitas", "Világítás"),
    kat("ures", "biOrb"),
    kat("hibas", "Szűrés"),
  ],
})

/** A gyerekek szama: 28, 0 (ures), es egy sikertelen szamlalas. */
const SZAMOK: Record<string, number | Error> = {
  vilagitas: 28,
  ures: 0,
  hibas: new Error("halozati hiba"),
}

const termekek = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    handle: `p${i}`,
    title: `Termék ${i}`,
    variants: [],
  }))

const lap = async (props: Record<string, unknown> = {}) =>
  render(
    await CommerceKategoriaLap({
      category: KATEGORIA,
      page: 1,
      countryCode: "hu",
      ...props,
    }),
  )

beforeEach(() => {
  adat.listProducts.mockImplementation(async ({ queryParams }) => {
    const ertek = SZAMOK[queryParams.category_id[0]]
    if (ertek instanceof Error) throw ertek
    return { response: { products: [], count: ertek }, nextPage: null }
  })
  adat.listProductsWithSort.mockResolvedValue({
    response: { products: termekek(LAP_MERET), count: 40 },
    nextPage: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * A COMMERCE KATEGORIALAP (117:30). MI PIROSIT: ha az ures alkategoria a
 * savba vagy a szurobe kerul; ha egy sikertelen szamlalas eltunteti a
 * gyereket; ha a lista nem a kategoriara, nem 18-asaval vagy marka nelkul
 * kerdez; ha a "hol tartunk" sor osszeset igér, amikor csak egy lapnyi all ott.
 */
describe("a Commerce kategórialap", () => {
  it("a cím és a morzsamenü a kategóriát és a felmenőit mutatja", async () => {
    await lap()
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "Termékek",
    )
    const morzsa = screen.getByRole("navigation", { name: "Morzsamenü" })
    expect(within(morzsa).getByRole("link").getAttribute("href")).toBe(
      "/hu/categories/gyoker",
    )
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Termékek",
    )
  })

  it("az üres alkategória kimarad, a számolatlan marad, szám nélkül", async () => {
    await lap()
    const sav = screen.getByTestId("gyors-kategoriak")
    expect(sav.textContent).toContain("Összes")
    expect(sav.textContent).toContain("Világítás")
    expect(sav.textContent).toContain("Szűrés")
    expect(sav.textContent).not.toContain("biOrb")

    const szuro = screen.getByTestId("szuro-kategoriak")
    const sorok = within(szuro)
      .getAllByRole("link")
      .map((a) => a.textContent)
    expect(sorok).toEqual(["Világítás28", "Szűrés"])
  })

  it("a lista a kategóriára, lapméretével és a márkával együtt kérdez", async () => {
    await lap({ sortBy: "price_asc" })
    const hivas = adat.listProductsWithSort.mock.calls[0][0]
    expect(hivas.queryParams.category_id).toEqual(["termekek"])
    expect(hivas.queryParams.limit).toBe(18)
    expect(hivas.queryParams.fields).toContain("*collection")
    expect(hivas.queryParams.fields).toContain("*variants.calculated_price")
    expect(hivas.sortBy).toBe("price_asc")
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 termék",
    )
  })

  it("az első lapon a Figma alakja, és van tovább", async () => {
    await lap()
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "18 / 40 termék",
    )
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?page=2")
  })

  it("a harmadik, utolsó lapon a sávot mondja, és nincs tovább", async () => {
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: termekek(4), count: 40 },
      nextPage: null,
    })
    await lap({ page: 3 })
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "37–40 / 40 termék",
    )
    expect(screen.queryByTestId("category-more-products")).toBeNull()
  })

  it("a következő lap címe megtartja a rendezést és az opció-szűrőket", () => {
    expect(kovetkezoLap(1, "price_desc", ["o1", "o2"])).toBe(
      "?sortBy=price_desc&optionValueIds=o1&optionValueIds=o2&page=2",
    )
  })
})
