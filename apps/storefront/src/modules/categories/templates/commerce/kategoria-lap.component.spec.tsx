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
const katAdat = vi.hoisted(() => ({ listCategories: vi.fn() }))
vi.mock("@lib/data/categories", () => katAdat)
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import CommerceKategoriaLap, {
  LAP_MERET,
  kovetkezoLap,
  savElemek,
} from "./kategoria-lap"

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
  led: 40,
  t5: 0,
  jelen: 0,
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
  // Alapbol ures testver-lista: egy `undefined` valasz az egesz lapot
  // eltorne, es az a teszt-dupla hibaja lenne, nem a kode.
  katAdat.listCategories.mockResolvedValue([])
  adat.listProducts.mockImplementation(async ({ queryParams, pageParam }) => {
    if (String(queryParams.fields).startsWith("id,collection")) {
      // Ket lap markaval: 150 termek, 100-asaval.
      const lap = pageParam ?? 1
      const n = lap === 1 ? 100 : 50
      return {
        response: {
          products: Array.from({ length: n }, (_, i) => ({
            id: `m${lap}-${i}`,
            collection:
              i % 5 === 0
                ? null
                : i % 2 === 0
                  ? { id: "pcol_ati", title: "ATI" }
                  : { id: "pcol_dd", title: "D-D" },
          })),
          count: 150,
        },
        nextPage: null,
      }
    }
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

  describe("levél-kategórián a testvérek (162:117)", () => {
    const LEVEL = kat("jelen", "Moonlight", {
      parent_category: kat("vilagitas", "Világítás"),
      category_children: [],
    })
    const TESTVEREK = [
      kat("led", "LED"),
      kat("jelen", "Moonlight"),
      kat("t5", "T5"),
    ]

    it("a sáv a testvéreket mutatja, az aktuálisat kiemelve, Összes nélkül", async () => {
      katAdat.listCategories.mockResolvedValue(TESTVEREK)
      await lap({ category: LEVEL })
      expect(katAdat.listCategories).toHaveBeenCalledWith({
        parent_category_id: "vilagitas",
        fields: "id,name,handle",
      })
      const sav = screen.getByTestId("gyors-kategoriak")
      expect(sav.textContent).not.toContain("Összes")
      expect(
        within(sav)
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["LED", "Moonlight"])
      expect(sav.querySelector("[aria-current='page']")?.textContent).toBe(
        "Moonlight",
      )
      expect(screen.queryByTestId("szuro-kategoriak")).toBeNull()
    })

    it("ha a testvérek lekérése elbukik, csak az Összes marad", async () => {
      katAdat.listCategories.mockRejectedValue(new Error("hálózat"))
      await lap({ category: LEVEL })
      expect(screen.getByTestId("gyors-kategoriak").textContent).toBe("Összes")
    })

    it("gyerekes kategórián nem kér testvért", async () => {
      await lap()
      expect(katAdat.listCategories).not.toHaveBeenCalled()
    })
  })

  it("a sáv döntése: az üres kimarad, az aktuális akkor is marad, ha üres", () => {
    const jelen = kat("jelen", "Moonlight")
    const { mod, elemek } = savElemek(
      jelen,
      [],
      [kat("led", "LED"), jelen, kat("t5", "T5")],
      [40, 0, 0],
    )
    expect(mod).toBe("testverek")
    expect(elemek.map((e) => [e.kategoria.id, e.aktiv])).toEqual([
      ["led", false],
      ["jelen", true],
    ])
  })

  describe("a márka szűrő (117:108)", () => {
    it("a márkák a kategória összes termékéből, darabszámmal", async () => {
      await lap()
      const markaHivasok = adat.listProducts.mock.calls
        .map(([h]) => h)
        .filter((h) => String(h.queryParams.fields).startsWith("id,collection"))
      expect(markaHivasok.map((h) => h.pageParam)).toEqual([1, 2])
      const sorok = within(screen.getByTestId("szuro-markak"))
        .getAllByRole("link")
        .map((a) => a.textContent)
      // 150 termek, ebbol 30 marka nelkul: 120, fele-fele.
      expect(sorok).toEqual(["ATI60", "D-D60"])
    })

    it("a kiválasztott márka szűri a listát, csíkot kap, és levehető", async () => {
      await lap({ markak: ["pcol_ati"], sortBy: "price_asc" })
      expect(
        adat.listProductsWithSort.mock.calls[0][0].queryParams.collection_id,
      ).toEqual(["pcol_ati"])
      const csik = within(screen.getByTestId("aktiv-szurok")).getByRole("link")
      expect(csik.textContent).toBe("ATI ×")
      expect(csik.getAttribute("href")).toBe("?sortBy=price_asc")
      const sor = within(screen.getByTestId("szuro-markak"))
        .getByText("ATI")
        .closest("a")
      expect(sor?.getAttribute("aria-current")).toBe("true")
      expect(
        screen.getByTestId("category-more-products").getAttribute("href"),
      ).toBe("?sortBy=price_asc&marka=pcol_ati&page=2")
    })

    it("márka nélkül nincs szűrés és nincs csík", async () => {
      await lap()
      expect(
        adat.listProductsWithSort.mock.calls[0][0].queryParams.collection_id,
      ).toBeUndefined()
      expect(screen.queryByTestId("aktiv-szurok")).toBeNull()
    })

    it("ha a márkák lekérése elbukik, a lap áll, Márka szakasz nélkül", async () => {
      const eredeti = adat.listProducts.getMockImplementation()!
      adat.listProducts.mockImplementation(async (h) => {
        if (String(h.queryParams.fields).startsWith("id,collection"))
          throw new Error("hálózat")
        return eredeti(h)
      })
      await lap()
      expect(screen.queryByTestId("szuro-markak")).toBeNull()
      expect(screen.getByTestId("category-page-title")).toBeTruthy()
    })
  })
})
