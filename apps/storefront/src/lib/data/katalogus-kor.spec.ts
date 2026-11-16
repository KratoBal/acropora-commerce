import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * A KOZOS KOR (task t-20261116-gyoker-ar-rendezes). A gyoker es a kategoria lista ar szerint a rendezo kort ES a marka-szamlalot
 * egyszerre futtatta, es mindketto a teljes halmazt olvasta (modellezve a teszt Medusan: kulon 1,6 s es 1,1 s, egyutt 2,8-3,0 s).
 * Most egy kor adja mindkettonek az adatot, kerelemenkent egyszer. MI PIROSIT: a ket hivo ket lekerest indit (a `cache` nem
 * oszt); a kor nem hozza a markat (a szamlalo ures lenne); egy masik kategoria vagy nyelv ugyanazt a memot kapja; a kor nem vegigmegy
 * a teljes halmazon; a mas szuro melletti halmaz is megosztott kort kap (a marka-szamlalo az egesz kategoriat szamolja, nem a
 * szurt halmazt); a szuro nelkuli ar szerinti rendezes nem oszt.
 */
vi.mock("react", async (eredeti) => {
  const valodi = await eredeti<typeof import("react")>()
  // egy kereses memoja, mint a szerver-oldali `cache`: azonos argumentumra azonos igeret
  const cache = <T extends (...args: never[]) => unknown>(fn: T): T => {
    const memo = new Map<string, unknown>()
    return ((...args: never[]) => {
      const kulcs = JSON.stringify(args)
      if (!memo.has(kulcs)) memo.set(kulcs, fn(...args))
      return memo.get(kulcs)
    }) as T
  }
  return { ...valodi, cache }
})
const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1" })),
  retrieveRegion: vi.fn(async () => ({ id: "reg_1" })),
}))
vi.mock("./cookies", () => ({ getPublicCacheOptions: vi.fn(async () => ({})) }))

import {
  katalogusKorEgyseru,
  korMegosztott,
} from "@lib/util/katalogus-kor-egyseru"
import { KATALOGUS_KOR_MEZOK } from "@lib/util/termeklista-mezok"

import { katalogusKorLista, listProductsWithSort } from "./products"

const DARAB = 250

beforeEach(() => {
  sdk.client.fetch.mockReset()
  sdk.client.fetch.mockImplementation(
    async (
      _ut: string,
      opciok: { query: { limit: number; offset: number } },
    ) => {
      const { limit, offset } = opciok.query
      const idk = Array.from({ length: DARAB }, (_, i) => i).slice(
        offset,
        offset + limit,
      )
      return {
        products: idk.map((i) => ({
          id: `p${i}`,
          collection: { id: `col_${i % 3}`, title: `Marka ${i % 3}` },
          // az ar a sorszam ellentettje: egy novekvo ar szerinti rendezes MEGFORDITANA a szerver sorrendjet
          variants: [{ calculated_price: { calculated_amount: DARAB - i } }],
        })),
        count: DARAB,
      }
    },
  )
})

type Lekerdezes = { offset: number; fields?: string; category_id?: string[] }
const lekerdezesek = () =>
  sdk.client.fetch.mock.calls.map(
    (hivas: unknown[]) => (hivas[1] as { query: Lekerdezes }).query,
  )

describe("katalogusKorLista", () => {
  it("a ket egyidejű hivo EGY lekerest oszt meg: harom lap, egyszer, a teljes halmazzal es a markaval", async () => {
    const [a, b] = await Promise.all([
      katalogusKorLista("pcat_x", "hu"),
      katalogusKorLista("pcat_x", "hu"),
    ])

    expect(a).toBe(b)
    expect(a.count).toBe(DARAB)
    expect(a.products).toHaveLength(DARAB)
    expect(a.products[0].collection?.title).toBe("Marka 0")
    expect(
      lekerdezesek()
        .map((q) => q.offset)
        .sort((x, y) => x - y),
    ).toEqual([0, 100, 200])
    expect(lekerdezesek().every((q) => q.fields === KATALOGUS_KOR_MEZOK)).toBe(
      true,
    )
    expect(lekerdezesek().every((q) => q.category_id?.[0] === "pcat_x")).toBe(
      true,
    )
  })

  it("a rendezes MASOLATON dolgozik: a kozos kor sorrendje a rendezes utan is a szerveri marad (a marka-szamlalo ugyanazt a listat latja)", async () => {
    await listProductsWithSort({
      page: 1,
      queryParams: { limit: 12 },
      sortBy: "price_asc",
      countryCode: "hu",
    })
    const kor = await katalogusKorLista("", "hu")

    // novekvo ar = fordított szerver-sorrend lenne, ha a rendezes a kozos listan dolgozna
    expect(kor.products.slice(0, 3).map((p) => p.id)).toEqual([
      "p0",
      "p1",
      "p2",
    ])
  })

  it("egy masik kategoria vagy nyelv kulon kort kap (a memo kulcsa a ketto egyutt)", async () => {
    await katalogusKorLista("pcat_a", "hu")
    await katalogusKorLista("pcat_b", "hu")
    await katalogusKorLista("pcat_a", "en-hu")
    // a memo a fajl tesztjei kozott megmarad: ugyanaz a kulcs masodszor nem kerdez
    await katalogusKorLista("pcat_a", "hu")

    expect(lekerdezesek()).toHaveLength(9)
    expect(
      lekerdezesek().filter((q) => q.category_id?.[0] === "pcat_a"),
    ).toHaveLength(6)
  })
})

describe("katalogusKorEgyseru, korMegosztott", () => {
  it("egyszeru halmaz: csak kategoria (vagy semmi), mas szuro nincs", () => {
    expect(katalogusKorEgyseru({ limit: 12, fields: "x" })).toBe(true)
    expect(
      katalogusKorEgyseru({ limit: 12, fields: "x", category_id: ["c"] }),
    ).toBe(true)
    for (const szuro of [
      { collection_id: ["m"] },
      { id: ["p"] },
      { option_value_id: ["o"] },
      { order: "-created_at" },
      { category_id: ["a", "b"] },
    ])
      expect(katalogusKorEgyseru({ limit: 12, ...szuro })).toBe(false)
  })

  it("a marka-szamlalo csak ar szerinti rendezesnel, szuro nelkul oszt", () => {
    expect(korMegosztott({ sortBy: "price_asc" })).toBe(true)
    expect(korMegosztott({ sortBy: "price_desc", markak: [] })).toBe(true)
    for (const nem of [
      { sortBy: "created_at" },
      {},
      { sortBy: "price_asc", markak: ["m"] },
      { sortBy: "price_asc", optionValueIds: ["o"] },
      { sortBy: "price_asc", tartasIdk: ["p"] },
      { sortBy: "price_asc", tartasIdk: [] },
    ])
      expect(korMegosztott(nem)).toBe(false)
  })
})
