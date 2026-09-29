import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))

import { foxpostSzallitasiAdat } from "@lib/util/csomagpont"

import { searchFoxpostPickupPoints } from "./csomagpont"

afterEach(() => vi.clearAllMocks())

const PONT = {
  id: "HU1",
  name: "FOXPOST A-BOX Gödöllő",
  address: "2100 Gödöllő, Fő tér 1.",
  zip: "2100",
  city: "Gödöllő",
  opening_hours: {},
  latitude: 47.6,
  longitude: 19.3,
}

/**
 * A CSOMAGPONT-KERESES (P4-1). MI PIROSIT: ha ures keresesre a teljes listat
 * kerne le; ha nem a keresot hivja a keresessel es a limittel; ha egy nem
 * elerheto vagy hibazo Foxpost elerhetonek latszik; ha a szallitasi mod adata
 * nem abban az alakban megy, amit a backend ellenoriz.
 */
describe("a Foxpost-csomagpont keresése", () => {
  it("üres keresésre nem kérdez", async () => {
    expect(await searchFoxpostPickupPoints("  ")).toEqual({
      elerheto: false,
      pontok: [],
      talalat: 0,
    })
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("a keresőt hívja a kereséssel és a limittel, és a pont öt mezőjét adja", async () => {
    sdk.client.fetch.mockResolvedValue({
      available: true,
      pickup_points: [PONT],
      count: 7,
    })
    const valasz = await searchFoxpostPickupPoints(" gödöllő ", 5)
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/foxpost/pickup-points")
    expect(opciok).toMatchObject({
      method: "GET",
      query: { q: "gödöllő", limit: 5 },
    })
    expect(valasz).toEqual({
      elerheto: true,
      pontok: [
        {
          id: "HU1",
          name: "FOXPOST A-BOX Gödöllő",
          address: "2100 Gödöllő, Fő tér 1.",
          zip: "2100",
          city: "Gödöllő",
        },
      ],
      talalat: 7,
    })
  })

  it("nem beállított Foxpostnál nem elérhető", async () => {
    sdk.client.fetch.mockResolvedValue({
      available: false,
      reason: "missing_configuration",
    })
    expect((await searchFoxpostPickupPoints("budapest")).elerheto).toBe(false)
  })

  it("hibánál (a lista nem érhető el, 503) sem elérhető, és nem dob", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("Service Unavailable"))
    expect((await searchFoxpostPickupPoints("budapest")).elerheto).toBe(false)
  })

  it("a szállítási mód adata a backend által ellenőrzött alak", () => {
    expect(foxpostSzallitasiAdat("HU1")).toEqual({
      foxpost_pickup_point: { id: "HU1" },
    })
  })
})
