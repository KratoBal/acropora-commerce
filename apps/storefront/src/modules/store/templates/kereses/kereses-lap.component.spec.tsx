import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/store",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("q=led"),
}))

const adat = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listProductsWithSort: vi.fn(),
}))
vi.mock("@lib/data/products", () => adat)
const kereses = vi.hoisted(() => ({ keresesTalalatok: vi.fn() }))
vi.mock("@lib/data/termek-kereses", () => kereses)
// A nulla-talalat lap (4b) sajat adatot ker; a sajat spec meri, itt ures.
vi.mock("@lib/data/regions", () => ({ getRegion: vi.fn(async () => null) }))
vi.mock("@lib/data/categories", () => ({
  listNonEmptyRootCategories: vi.fn(),
  listCategoryIdsWithDescendants: vi.fn(),
}))
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import KeresesLap, { TALALAT_LAP } from "./kereses-lap"

const gyoker = (id: string, name: string) => ({
  id,
  name,
  parent_category_id: null,
})

/**
 * 150 talalat: p0-p89 Technika (ATI es D-D felvaltva), p90-p149 Korallok
 * (marka nelkul). A meta-lekeres 100-asaval jon, tehat ket hivas.
 */
const IDS = Array.from({ length: 150 }, (_, i) => `p${i}`)
const meta = (id: string) => {
  const i = Number(id.slice(1))
  return i < 90
    ? {
        id,
        collection:
          i % 2 === 0
            ? { id: "ati", title: "ATI" }
            : { id: "dd", title: "D-D" },
        categories: [gyoker("tech", "Technika")],
      }
    : { id, collection: null, categories: [gyoker("korall", "Korallok")] }
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
    await KeresesLap({ kereses: "led", countryCode: "hu", page: 1, ...props }),
  )

beforeEach(() => {
  kereses.keresesTalalatok.mockResolvedValue({
    ids: IDS,
    count: 150,
    csonkolt: false,
  })
  adat.listProducts.mockImplementation(async ({ queryParams }) => ({
    response: {
      products: (queryParams.id as string[]).map(meta),
      count: (queryParams.id as string[]).length,
    },
    nextPage: null,
  }))
  adat.listProductsWithSort.mockResolvedValue({
    response: { products: termekek(TALALAT_LAP), count: 150 },
    nextPage: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * A KERESESI TALALATOK LAPJA (152:88). MI PIROSIT: ha a fej nem a keresest
 * mutatja; ha a csonkolas sora hianyzik vagy kitalalt szammal all; ha a fulek
 * nem a talalatok gyokereit szamoljak; ha a Márka nem a talalatokbol jon; ha
 * a szuro nem jut el a lekerdezesig; ha ures halmazzal lekerdezes indul.
 */
describe("a keresési találatok lapja", () => {
  it("a fej: felülcím, cím, a mező a kérdéssel, a találatszám", async () => {
    await lap()
    expect(screen.getByTestId("store-page-title").textContent).toBe("Találatok")
    const mezo = screen.getByRole("searchbox", { name: "Keresés" })
    expect((mezo as HTMLInputElement).defaultValue).toBe("led")
    expect(mezo.closest("form")?.getAttribute("action")).toBe("/hu/store")
    expect(screen.getByTestId("kereses-talalatszam").textContent).toBe(
      "150 találat erre: „led”",
    )
  })

  it("a csonkolás sora csak levágott listánál áll, a szám a válaszból", async () => {
    await lap()
    expect(screen.queryByTestId("kereses-csonkolt")).toBeNull()
    cleanup()

    kereses.keresesTalalatok.mockResolvedValue({
      ids: IDS,
      count: 137,
      csonkolt: true,
    })
    await lap()
    expect(screen.getByTestId("kereses-csonkolt").textContent).toContain(
      "Több mint 137 termék illik erre a keresésre, itt a 137 legújabb látszik.",
    )
  })

  it("a besorolás 100-asával kéri le a találatokat, a gyökérrel és a márkával", async () => {
    await lap()
    const hivasok = adat.listProducts.mock.calls.map(([h]) => h.queryParams)
    expect(hivasok.map((q) => q.id.length)).toEqual([100, 50])
    expect(hivasok[0].fields).toBe(
      "id,collection.id,collection.title,*categories",
    )
  })

  it("a fülek a találatok gyökerei, darabszámmal; az Összes az aktív", async () => {
    await lap()
    const fulek = within(screen.getByTestId("kereses-gyokerek")).getAllByRole(
      "link",
    )
    expect(fulek.map((a) => a.textContent)).toEqual([
      "Összes",
      "Technika · 90",
      "Korallok · 60",
    ])
    expect(fulek[0].getAttribute("aria-current")).toBe("page")
    expect(fulek[1].getAttribute("href")).toBe("?q=led&gyoker=tech")
  })

  it("a Márka a találatokból számol, és a gyökérre szűkül", async () => {
    await lap()
    const markak = within(screen.getByTestId("kereses-markak"))
      .getAllByRole("link")
      .map((a) => a.textContent)
    expect(markak).toEqual(["ATI45", "D-D45"])
    cleanup()

    await lap({ gyoker: "korall" })
    expect(screen.queryByTestId("kereses-markak")).toBeNull()
    expect(
      screen.getByText("Ezekhez a találatokhoz nincs márkaadat."),
    ).toBeTruthy()
  })

  it("a szűrő a lekérdezésig jut: a gyökér és a márka metszete, 18-asával", async () => {
    await lap({ gyoker: "tech", markak: ["dd"], sortBy: "price_asc", page: 2 })
    const [hivas] = adat.listProductsWithSort.mock.calls[0]
    expect(hivas.page).toBe(2)
    expect(hivas.sortBy).toBe("price_asc")
    expect(hivas.queryParams.limit).toBe(TALALAT_LAP)
    expect(hivas.queryParams.id).toHaveLength(45)
    expect(hivas.queryParams.id.slice(0, 2)).toEqual(["p1", "p3"])
    expect(String(hivas.queryParams.fields)).toContain("*collection")
  })

  it("nulla találatnál a nincs-találat lap áll, lekérdezés nélkül", async () => {
    kereses.keresesTalalatok.mockResolvedValue({
      ids: [],
      count: 0,
      csonkolt: false,
    })
    await lap()
    expect(adat.listProductsWithSort).not.toHaveBeenCalled()
    expect(adat.listProducts).not.toHaveBeenCalled()
    expect(screen.getByTestId("store-page-title").textContent).toBe(
      "Nincs találat",
    )
    expect(
      (screen.getByRole("searchbox", { name: "Keresés" }) as HTMLInputElement)
        .defaultValue,
    ).toBe("led")
    expect(screen.getByTestId("kereses-nincs-talalat")).toBeTruthy()
  })

  it("üres szűrt halmaznál sincs lekérdezés, és a szűrőt nevezi meg", async () => {
    await lap({ gyoker: "korall", markak: ["ati"] })
    expect(adat.listProductsWithSort).not.toHaveBeenCalled()
    expect(screen.getByTestId("kereses-szurt-ures").textContent).toBe(
      "A szűrőkkel együtt nincs találat.",
    )
    expect(screen.queryByTestId("kereses-nincs-talalat")).toBeNull()
  })

  it("a hol tartunk sor és a További találatok a következő lapra visz", async () => {
    await lap()
    expect(screen.getByTestId("kereses-hol-tartunk").textContent).toBe(
      "18 / 150 találat",
    )
    expect(screen.getByTestId("kereses-tovabb").getAttribute("href")).toBe(
      "?q=led&page=2",
    )
    expect(screen.getAllByTestId("commerce-termek-kartya")).toHaveLength(
      TALALAT_LAP,
    )
  })
})
