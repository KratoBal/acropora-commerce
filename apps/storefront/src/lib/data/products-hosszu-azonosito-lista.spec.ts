import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * A HOSSZU `id` LISTA A TELJES HALMAZON RENDEZ ES LAPOZ (kartya 30b376de).
 *
 * A kereses a talalatokat 200-nal vagta le, mert az `id` szuro a lekerdezes cimebe megy; a regebbi talalatok
 * kiestek, es az ar szerinti rendezes csak a 200 legujabbat rendezte. A fuggveny most csomagokban kerdez, es a 201.
 * azonositot is latja. A spec a `sdk.client.fetch` hivasait meri, tehat a LEKERDEZESEKET, nem a fuggveny belsejet.
 */
const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1" })),
  retrieveRegion: vi.fn(async () => ({ id: "reg_1" })),
}))
vi.mock("./cookies", () => ({ getPublicCacheOptions: vi.fn(async () => ({})) }))

import { listProductsWithSort } from "./products"

/** 250 azonosito, a 201. (a 200-as index) a LEGOLCSOBB termek. */
const IDS = Array.from({ length: 250 }, (_, i) => `p${i}`)
const ar = (id: string) => (id === "p200" ? 1 : 1000 + Number(id.slice(1)))

type Lekerdezes = { id: string[]; limit: number }

beforeEach(() => {
  sdk.client.fetch.mockReset()
  // a Store API: a kapott `id` halmaz termekei, SZANDEKOSAN fordított sorrendben (a hivonak kell sorba tennie)
  sdk.client.fetch.mockImplementation(
    async (_ut: string, opciok: { query: Lekerdezes }) => ({
      products: [...opciok.query.id].reverse().map((id) => ({
        id,
        created_at: "2026-01-01T00:00:00Z",
        variants: [{ calculated_price: { calculated_amount: ar(id) } }],
      })),
      count: opciok.query.id.length,
    }),
  )
})

const lekerdezesek = () =>
  sdk.client.fetch.mock.calls.map(
    (hivas: unknown[]) => (hivas[1] as { query: Lekerdezes }).query,
  )

describe("listProductsWithSort, hosszu azonosito-lista", () => {
  it("idorendben a lap a SAJAT azonositoit kerdezi le, a 201. azonositot is latja, es a lista sorrendjeben adja", async () => {
    // a 201. elem a 12. lapon van (199-216. elem, 18 / lap)
    const { response, nextPage } = await listProductsWithSort({
      page: 12,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "created_at",
      countryCode: "hu",
      azonositokIdorendben: true,
    })

    expect(response.products.map((p) => p.id)).toEqual(IDS.slice(198, 216))
    expect(response.products.map((p) => p.id)).toContain("p200")
    // a darabszam a TELJES halmaz, nem a lap vagy egy levagott lista
    expect(response.count).toBe(250)
    expect(nextPage).toBe(13)
    // EGY kis lekerdezes, nem a 250 azonosito
    expect(lekerdezesek()).toHaveLength(1)
    expect(lekerdezesek()[0].id).toEqual(IDS.slice(198, 216))
  })

  it("az utolso lap utan nincs kovetkezo, es az azon tuli lap ures de a darabszam valodi", async () => {
    const utolso = await listProductsWithSort({
      page: 14,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "created_at",
      countryCode: "hu",
      azonositokIdorendben: true,
    })
    expect(utolso.response.products.map((p) => p.id)).toEqual(IDS.slice(234))
    expect(utolso.nextPage).toBeNull()

    const tul = await listProductsWithSort({
      page: 15,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "created_at",
      countryCode: "hu",
      azonositokIdorendben: true,
    })
    expect(tul.response.products).toEqual([])
    expect(tul.response.count).toBe(250)
  })

  it("ar szerint a 201. termek (a legolcsobb) az ELSO lapra kerul, es egy lekerdezes sem visz szaznal tobb azonositot", async () => {
    const { response } = await listProductsWithSort({
      page: 1,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "price_asc",
      countryCode: "hu",
    })

    expect(response.products[0].id).toBe("p200")
    expect(response.count).toBe(250)
    // csomagok, nem egyetlen 250 azonositos cim: 100 + 100 + 50
    expect(
      lekerdezesek()
        .map((q) => q.id.length)
        .sort((a, b) => b - a),
    ).toEqual([100, 100, 50])
    expect(
      Math.max(...lekerdezesek().map((q) => q.id.length)),
    ).toBeLessThanOrEqual(100)
  })

  it("ar szerint, csokkenoen, a legdragabb a lap elejen, es a lapozas a teljes halmazon megy", async () => {
    const elso = await listProductsWithSort({
      page: 1,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "price_desc",
      countryCode: "hu",
    })
    expect(elso.response.products[0].id).toBe("p249")
    expect(elso.nextPage).toBe(2)

    // az utolso lap a legolcsobbat tartalmazza: p200 (ar 1) az utolso a csokkeno sorban
    const utolso = await listProductsWithSort({
      page: 14,
      queryParams: { id: IDS, limit: 18 },
      sortBy: "price_desc",
      countryCode: "hu",
    })
    expect(utolso.response.products.at(-1)?.id).toBe("p200")
  })

  it("a rovid lista (szaz azonosito vagy kevesebb) a MAI uton megy: egy lekerdezes, szerver-oldali rendezes", async () => {
    const rovid = IDS.slice(0, 100)
    await listProductsWithSort({
      page: 1,
      queryParams: { id: rovid, limit: 18 },
      sortBy: "created_at",
      countryCode: "hu",
      azonositokIdorendben: true,
    })
    expect(lekerdezesek()).toHaveLength(1)
    expect(lekerdezesek()[0].id).toHaveLength(100)
    expect(sdk.client.fetch.mock.calls[0][1].query.order).toBe("-created_at")
  })
})
