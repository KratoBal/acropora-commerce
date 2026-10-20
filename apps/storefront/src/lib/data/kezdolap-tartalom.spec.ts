// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))

import { kezdolapTartalom } from "./kezdolap-tartalom"

/**
 * A KEZDOLAP TARTALMANAK LEKERESE.
 *
 * MI PIROSIT: ha a `null` valasz nem `null`; ha egy 404 (a backend meg nem
 * ismeri a vegpontot) kivetelt dob, es a kezdolap leesik; ha egy MAS hiba
 * (5xx, halozat) `null`-ra szelidul, es az ISR a kezdoertekeket tarolja a
 * szerkesztett szovegek helyett.
 */
describe("a kezdőlap tartalmának lekérése", () => {
  beforeEach(() => sdk.client.fetch.mockReset())

  it("a bolt tartalma, vagy null, ha még nincs", async () => {
    const tartalom = { texts: { "hero.tenyek.1.cim": "x" }, slides: [] }
    sdk.client.fetch.mockResolvedValueOnce({ homepage_content: tartalom })
    expect(await kezdolapTartalom()).toEqual(tartalom)
    sdk.client.fetch.mockResolvedValueOnce({ homepage_content: null })
    expect(await kezdolapTartalom()).toBeNull()
  })

  it("a 404 (ismeretlen végpont) null, minden más hiba továbbmegy", async () => {
    sdk.client.fetch.mockRejectedValueOnce({ status: 404 })
    expect(await kezdolapTartalom()).toBeNull()
    sdk.client.fetch.mockRejectedValueOnce({ status: 500 })
    await expect(kezdolapTartalom()).rejects.toMatchObject({ status: 500 })
    sdk.client.fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))
    await expect(kezdolapTartalom()).rejects.toThrow("ECONNREFUSED")
  })

  it("a közös címkével kér", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ homepage_content: null })
    await kezdolapTartalom()
    const [ut, opcio] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/homepage-content")
    expect(opcio.next.tags).toEqual(["homepage-content"])
  })
})
