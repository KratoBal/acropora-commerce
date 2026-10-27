import { beforeEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ tartalom: vi.fn() }))
vi.mock("@lib/data/kezdolap-tartalom", () => ({
  kezdolapTartalom: adat.tartalom,
}))

import { GET } from "./route"

beforeEach(() => {
  adat.tartalom.mockReset()
})

/**
 * A KEZDOLAP MARADT MINTA-TENYEI (audit S7). MI PIROSIT: ha a tartalom nelkuli
 * (az OS meg nem irt) kezdolap nullat jelentene; ha az OS sajat erteke mintanak
 * szamitana; ha az OS erteke egy minta-kulcsra nem csokkentene a szamot; ha a
 * hibas olvasas (elerhetetlen bolt) "nulla" lenne; ha ertekek kiszivarognanak.
 */
describe("GET /api/health/kezdolap-minta", () => {
  it("OS-tartalom nélkül minden jelölt tény megmarad", async () => {
    adat.tartalom.mockResolvedValue(null)
    const valasz = await GET()
    const torzs = await valasz.json()
    expect(torzs.status).toBe("sample_facts_remain")
    expect(torzs.count).toBeGreaterThan(5)
    expect(torzs.keys).toContain("velemenyek.pont")
    expect(torzs.keys).toContain("bolt.cim_ertek")
  })

  it("amit az OS ír, az már nem minta (akár üres érték is)", async () => {
    adat.tartalom.mockResolvedValue(null)
    const mind = (await (await GET()).json()) as { count: number }
    adat.tartalom.mockResolvedValue({
      texts: { "bolt.cim_ertek": "Valódi utca 1.", "bolt.nyitva_ertek": "" },
    })
    const torzs = await (await GET()).json()
    expect(torzs.keys).not.toContain("bolt.cim_ertek")
    expect(torzs.keys).not.toContain("bolt.nyitva_ertek")
    expect(torzs.count).toBe(mind.count - 2)
  })

  it("ha minden jelölt tényhez van OS-érték, a szám nulla és az állapot ok", async () => {
    adat.tartalom.mockResolvedValue(null)
    const { keys } = (await (await GET()).json()) as { keys: string[] }
    adat.tartalom.mockResolvedValue({
      texts: Object.fromEntries(keys.map((k) => [k, "valódi"])),
    })
    const torzs = await (await GET()).json()
    expect(torzs).toEqual({ status: "ok", count: 0, keys: [] })
  })

  it("elérhetetlen bolt: 503 és ismeretlen, nem nulla", async () => {
    adat.tartalom.mockRejectedValue(new Error("ECONNREFUSED"))
    const valasz = await GET()
    expect(valasz.status).toBe(503)
    expect(await valasz.json()).toEqual({ status: "unknown" })
  })

  it("csak kulcsokat ad, a kezdőértékek szövegét nem", async () => {
    adat.tartalom.mockResolvedValue(null)
    const szoveg = JSON.stringify(await (await GET()).json())
    expect(szoveg).not.toMatch(/Ft|Budapest|★/)
  })
})
