import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * AZ AR SZERINTI RENDEZES SZUK RENDEZO KORT KAP (task t-20261115-ar-rendezes-szukites).
 *
 * A Store API nem tud arra rendezni, ezert a kirakat a teljes halmazt lehivja, es memoriaban rendez. Eddig MINDEN lap a
 * teljes mezokeszlettel jott (az osszes termek ar szerinti rendezese a teszt Medusan 8,9 MB / 3,1 s, mert a kepek, opciok,
 * metaadat is vele jott). Most a rendezo kor csak az azonositot, a letrehozas idejet es az arat kerdezi, a megjeleno lap
 * termekei pedig egy KULON lekeresben kapjak a hivo mezoit. A spec a `sdk.client.fetch` hivasait meri, tehat a
 * LEKERDEZESEKET, es azt, mit kap vissza a hivo.
 *
 * MI PIROSIT: a rendezo kor a teljes mezokkel kerdez (a merete nem csokken); a lap a szuk mezokkel jon vissza (hianyzik a
 * cim); a lap nem a hivo mezoit kapja; a lap sorrendje nem a rendezett sorrend (a Store API az `id` szurore mas
 * sorrendben valaszol); az ures lap is lekerest indit; az idorendi ag is a rendezo korbe kerul; a rendezes kimenete
 * (egyenlo arak sorrendje, ar nelkuli termek) megvaltozik a szukitestol.
 */
const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1" })),
  retrieveRegion: vi.fn(async () => ({ id: "reg_1" })),
}))
vi.mock("./cookies", () => ({ getPublicCacheOptions: vi.fn(async () => ({})) }))

import {
  RENDEZO_KOR_MEZOK,
  TERMEKLISTA_MEZOK,
  termeklistaMezok,
} from "@lib/util/termeklista-mezok"

import { listProductsWithSort } from "./products"

/** 250 termek, sok egyenlo arral, es harom ar nelkuli (nincs valtozat). */
const DARAB = 250
const ar = (i: number) => ((i * 37) % 50) * 100 + 500
const KATALOGUS = Array.from({ length: DARAB }, (_, i) => ({
  id: `p${i}`,
  title: `Termek ${i}`,
  created_at: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
  metadata: { kulcs: i },
  variants:
    i % 97 === 0
      ? []
      : [
          {
            calculated_price: { calculated_amount: ar(i) },
            inventory_quantity: 1,
            images: [{ url: "k.jpg" }],
          },
        ],
}))
const POZICIO = new Map(KATALOGUS.map((t, i) => [t.id, i]))

/** Az elvart sorrend: ar szerint, EGYENLO arnal a Store API sorrendje (stabil), ar nelkul a vegen. */
const kulcs = (i: number) => (i % 97 === 0 ? Infinity : ar(i))
const ELVART_NOVEKVO = KATALOGUS.map((_, i) => i)
  .sort((a, b) => (kulcs(a) === kulcs(b) ? 0 : kulcs(a) - kulcs(b)))
  .map((i) => `p${i}`)

type Lekerdezes = {
  limit: number
  offset: number
  fields?: string
  id?: string | string[]
  order?: string
  category_id?: string[]
}

beforeEach(() => {
  sdk.client.fetch.mockReset()
  sdk.client.fetch.mockImplementation(
    async (_ut: string, opciok: { query: Lekerdezes }) => {
      const q = opciok.query
      let halmaz = KATALOGUS
      if (q.id) {
        const idk = ([] as string[]).concat(q.id)
        // a Store API az `id` szurore a SAJAT sorrendjeben valaszol, nem a kert sorrendben
        halmaz = KATALOGUS.filter((t) => idk.includes(t.id))
        halmaz = [...halmaz].reverse()
      }
      const lap = halmaz.slice(q.offset, q.offset + q.limit)
      const szuk = q.fields === RENDEZO_KOR_MEZOK
      return {
        products: szuk
          ? lap.map((t) => ({
              id: t.id,
              created_at: t.created_at,
              variants: t.variants.map((v) => ({
                calculated_price: v.calculated_price,
              })),
            }))
          : lap,
        count: halmaz.length,
      }
    },
  )
})

const lekerdezesek = () =>
  sdk.client.fetch.mock.calls.map(
    (hivas: unknown[]) => (hivas[1] as { query: Lekerdezes }).query,
  )
const rendezoKor = () =>
  lekerdezesek().filter((q) => q.fields === RENDEZO_KOR_MEZOK)
const lapLekeresek = () =>
  lekerdezesek().filter((q) => q.fields !== RENDEZO_KOR_MEZOK)

const KATEGORIA = { category_id: ["pcat_1"] }

describe("listProductsWithSort, ar szerinti rendezes szuk rendezo korrel", () => {
  it("a rendezo kor SZUK mezokkel kerdez, szazasaval, egymas utan; a megjeleno lap egy kulon lekeres a teljes mezokkel", async () => {
    const { response, nextPage } = await listProductsWithSort({
      page: 1,
      queryParams: { ...KATEGORIA, limit: 12 },
      sortBy: "price_asc",
      countryCode: "hu",
    })

    // 250 termek: harom szazas lap, mind a szuk mezokkel
    expect(rendezoKor().map((q) => q.offset)).toEqual([0, 100, 200])
    expect(rendezoKor().every((q) => q.limit === 100)).toBe(true)
    // a szuro (kategoria) a rendezo korben is ott van
    expect(rendezoKor().every((q) => q.category_id?.[0] === "pcat_1")).toBe(
      true,
    )
    // a lap: EGY lekeres, 12 azonositoval, a lista alapmezoivel
    expect(lapLekeresek()).toHaveLength(1)
    expect(lapLekeresek()[0].id).toHaveLength(12)
    expect(lapLekeresek()[0].fields).toBe(TERMEKLISTA_MEZOK)
    expect(lapLekeresek()[0].category_id?.[0]).toBe("pcat_1")

    // a hivo TELJES termekeket kap (cim, metaadat, kep), a rendezett sorrendben, a valodi darabszammal
    expect(response.products.map((p) => p.id)).toEqual(
      ELVART_NOVEKVO.slice(0, 12),
    )
    expect(response.products[0].title).toBe(
      `Termek ${POZICIO.get(ELVART_NOVEKVO[0])}`,
    )
    expect(response.products[0].metadata).toBeDefined()
    expect(response.count).toBe(DARAB)
    expect(nextPage).toBe(2)
  })

  it("a hivo mezoi (queryParams.fields) a LAP lekeresere mennek, nem a rendezo korre", async () => {
    await listProductsWithSort({
      page: 1,
      queryParams: { ...KATEGORIA, limit: 12, fields: termeklistaMezok },
      sortBy: "price_asc",
      countryCode: "hu",
    })

    expect(rendezoKor()).toHaveLength(3)
    expect(lapLekeresek()).toHaveLength(1)
    expect(lapLekeresek()[0].fields).toBe(termeklistaMezok)
  })

  it("az osszes lap egymas utan pontosan a rendezett sorrendet adja: egyenlo arnal a szerver sorrendje, ar nelkul a veg", async () => {
    const osszes: string[] = []
    for (let oldal = 1; oldal <= 21; oldal++) {
      const { response } = await listProductsWithSort({
        page: oldal,
        queryParams: { ...KATEGORIA, limit: 12 },
        sortBy: "price_asc",
        countryCode: "hu",
      })
      osszes.push(...response.products.map((p) => p.id))
    }

    expect(osszes).toEqual(ELVART_NOVEKVO)
    // az ar nelkuli harom termek (p0, p97, p194) a lista legvegen
    expect(osszes.slice(-3)).toEqual(["p0", "p97", "p194"])
  })

  it("csokkeno rendezes, a masodik lap; es az utolso lap utan ures a lap, es NINCS lap-lekeres", async () => {
    const masodik = await listProductsWithSort({
      page: 2,
      queryParams: { ...KATEGORIA, limit: 12 },
      sortBy: "price_desc",
      countryCode: "hu",
    })
    // csokkenoen az ar nelkuli (Infinity) termek elol van
    const ELVART_CSOKKENO = KATALOGUS.map((_, i) => i)
      .sort((a, b) => (kulcs(a) === kulcs(b) ? 0 : kulcs(b) - kulcs(a)))
      .map((i) => `p${i}`)
    expect(masodik.response.products.map((p) => p.id)).toEqual(
      ELVART_CSOKKENO.slice(12, 24),
    )

    sdk.client.fetch.mockClear()
    const tul = await listProductsWithSort({
      page: 22,
      queryParams: { ...KATEGORIA, limit: 12 },
      sortBy: "price_asc",
      countryCode: "hu",
    })
    expect(tul.response.products).toEqual([])
    expect(tul.response.count).toBe(DARAB)
    expect(tul.nextPage).toBeNull()
    expect(lapLekeresek()).toHaveLength(0)
    expect(rendezoKor()).toHaveLength(3)
  })

  it("az idorendi ag VALTOZATLAN: egy lekeres, szerver-oldali rendezes, nincs rendezo kor", async () => {
    await listProductsWithSort({
      page: 1,
      queryParams: { ...KATEGORIA, limit: 12 },
      sortBy: "created_at",
      countryCode: "hu",
    })

    expect(lekerdezesek()).toHaveLength(1)
    expect(lekerdezesek()[0].order).toBe("-created_at")
    expect(lekerdezesek()[0].fields).toBe(TERMEKLISTA_MEZOK)
    expect(lekerdezesek()[0].id).toBeUndefined()
    expect(rendezoKor()).toHaveLength(0)
  })
})
