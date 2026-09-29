import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ listProducts: vi.fn() }))
vi.mock("@lib/data/products", () => adat)
const regio = vi.hoisted(() => ({ getRegion: vi.fn() }))
vi.mock("@lib/data/regions", () => regio)
const katAdat = vi.hoisted(() => ({
  listNonEmptyRootCategories: vi.fn(),
  listCategoryIdsWithDescendants: vi.fn(),
}))
vi.mock("@lib/data/categories", () => katAdat)

import NincsTalalatLap from "./nincs-talalat-lap"

const kat = (
  id: string,
  handle: string,
  category_children: { id: string; handle: string }[] = [],
) => ({ id, handle, category_children })

const GYOKEREK = [
  kat("k", "korallok"),
  kat("h", "halak"),
  kat("t", "termékek", [{ id: "v", handle: "vízkezelés---termékek" }]),
  kat("g", "gerinctelenek"),
]

const lap = async () =>
  render(await NincsTalalatLap({ kereses: "xyzzypump123", countryCode: "hu" }))

beforeEach(() => {
  regio.getRegion.mockResolvedValue({ id: "reg_hu" })
  katAdat.listNonEmptyRootCategories.mockResolvedValue({
    gyokerek: GYOKEREK,
    nevek: new Map(),
    szamok: new Map([
      ["k", 8],
      ["h", 57],
      ["t", 1300],
      ["g", 7],
    ]),
  })
  katAdat.listCategoryIdsWithDescendants.mockResolvedValue(["v", "v1"])
  adat.listProducts.mockResolvedValue({
    response: { products: [], count: 128 },
    nextPage: null,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * A NINCS-TALALAT LAP (253:57). MI PIROSIT: ha a fej nem a kerdest tartja a
 * mezoben; ha a tanacs nem nevezi meg a kerdest; ha a tippek nem kereses-
 * linkek; ha a segitseg nem a Hamarosan lapra visz; ha a kartyak nem a menu
 * oldallal biro pontjai, vagy a szamuk nem a reszfara szol; ha egy hibas
 * szamolas nullat ir ki.
 */
describe("a nincs-találat lap", () => {
  it("a fej: cím, a mező a kérdéssel, a keresés a boltra megy", async () => {
    await lap()
    expect(screen.getByTestId("store-page-title").textContent).toBe(
      "Nincs találat",
    )
    const mezo = screen.getByRole("searchbox", { name: "Keresés" })
    expect((mezo as HTMLInputElement).defaultValue).toBe("xyzzypump123")
    expect(mezo.closest("form")?.getAttribute("action")).toBe("/hu/store")
  })

  it("az üres állapot tanácsot és tippeket ad", async () => {
    await lap()
    const doboz = screen.getByTestId("kereses-nincs-talalat")
    expect(within(doboz).getByRole("heading").textContent).toBe(
      "Nem találtunk ilyet",
    )
    expect(doboz.textContent).toContain(
      "Próbáld rövidebb kifejezéssel, márkanévvel, cikkszámmal",
    )
    const tippek = within(screen.getByTestId("kereses-tippek")).getAllByRole(
      "link",
    )
    expect(tippek.map((a) => a.getAttribute("href"))).toEqual([
      "?q=ReefLED",
      "?q=Acropora",
      "?q=Boh%C3%B3chal",
      "?q=KH+teszt",
      "?q=MP40",
    ])
    expect(screen.getByTestId("kereses-segitseg").getAttribute("href")).toBe(
      "/hu/hamarosan/szakerto",
    )
  })

  it("a kategóriák a menü oldallal bíró pontjai, a részfa termékszámával", async () => {
    await lap()
    const kartyak = within(
      screen.getByTestId("kereses-kategoriak"),
    ).getAllByRole("link")
    expect(kartyak.map((a) => [a.getAttribute("href"), a.textContent])).toEqual(
      [
        ["/hu/categories/korallok", "Korallok8 termék"],
        ["/hu/categories/halak", "Halak57 termék"],
        ["/hu/categories/gerinctelenek", "Gerinctelenek7 termék"],
        ["/hu/categories/vízkezelés---termékek", "Vízkezelés128 termék"],
      ],
    )
    // Az alkategoria szama a reszfara szol, egy termeknyi lekeressel.
    expect(katAdat.listCategoryIdsWithDescendants).toHaveBeenCalledWith("v")
    const [hivas] = adat.listProducts.mock.calls[0]
    expect(hivas.queryParams).toMatchObject({
      category_id: ["v", "v1"],
      limit: 1,
    })
  })

  it("hibás számolásnál a kártya szám nélkül áll, nem nullával", async () => {
    adat.listProducts.mockRejectedValue(new Error("halozati hiba"))
    await lap()
    // Nev szerint, nem hely szerint: a kartyak szama es sorrendje mas
    // allitas dolga.
    const kartya = within(screen.getByTestId("kereses-kategoriak"))
      .getAllByRole("link")
      .find((a) => a.textContent?.startsWith("Vízkezelés"))
    expect(kartya?.textContent).toBe("Vízkezelés")
  })

  it("régió nélkül nincs kategória-rész, az üres állapot marad", async () => {
    regio.getRegion.mockResolvedValue(null)
    await lap()
    expect(screen.queryByTestId("kereses-kategoriak")).toBeNull()
    expect(screen.getByTestId("kereses-nincs-talalat")).toBeTruthy()
  })
})
