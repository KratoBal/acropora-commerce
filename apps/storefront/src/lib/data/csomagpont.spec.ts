import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))

import { foxpostSzallitasiAdat } from "@lib/util/csomagpont"

import {
  retrieveGlsOptions,
  searchFoxpostPickupPoints,
  searchGlsPickupPoints,
} from "./csomagpont"

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

/**
 * A GLS-CSOMAGPONT KERESÉSE (P4). MI PIROSIT: ha nem a mód azonosítójával
 * kérdez; ha a cím nem a Foxposthoz hasonló alakban jön (irányítószámmal elöl);
 * ha a GLS-módok listájának hibája eltöri a pénztárt.
 */
describe("a GLS-csomagpont keresése", () => {
  it("a mód azonosítójával kérdez, és a címet irányítószámmal elöl adja", async () => {
    sdk.client.fetch.mockResolvedValue({
      available: true,
      pickup_points: [{ id: "SHOP1", name: "Bolt", zip: "2100", city: "Gödöllő", address: "Fő tér 1." }],
      count: 1,
    })
    const valasz = await searchGlsPickupPoints(" 2100 ", "so_gls")
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/gls/pickup-points")
    expect(opciok).toMatchObject({ query: { q: "2100", option_id: "so_gls", limit: 20 } })
    expect(valasz.pontok[0]).toEqual({
      id: "SHOP1",
      name: "Bolt",
      address: "2100 Gödöllő, Fő tér 1.",
      zip: "2100",
      city: "Gödöllő",
    })
  })

  it("a GLS-módok hibája üres listát ad, nem dob", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("503"))
    expect(await retrieveGlsOptions()).toEqual([])
  })
})

