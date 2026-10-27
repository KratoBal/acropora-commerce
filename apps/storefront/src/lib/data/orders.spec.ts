import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
const suti = vi.hoisted(() => ({ ertek: undefined as string | undefined }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheOptions: vi.fn(async () => ({})),
  getRendelesMegtekintes: vi.fn(async () => suti.ertek),
}))

import { RENDELES_MEGTEKINTES_FEJLEC } from "@lib/util/rendeles-megtekintes"

import { retrieveOrder } from "./orders"

afterEach(() => {
  vi.clearAllMocks()
  suti.ertek = undefined
})

/**
 * A RENDELES LEKERDEZESE A MEGTEKINTESI SUTIVEL (audit A6b). MI PIROSIT: ha a
 * suti megvan, de a hatter nem kapja meg (a vendeg a leadas utan 404-et
 * latna); ha a suti nelkul is megy fejlec (ures ertek); ha az ugyfel
 * hitelesito fejlece elveszik mellole.
 */
describe("retrieveOrder", () => {
  it("a süti meglétekor továbbítja a háttérnek, a belépési fejléc mellett", async () => {
    suti.ertek = "123.order_A.abcd"
    sdk.client.fetch.mockResolvedValueOnce({ order: { id: "order_A" } })
    await retrieveOrder("order_A")
    const [url, opciok] = sdk.client.fetch.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ]
    expect(url).toBe("/store/orders/order_A")
    expect(opciok.headers[RENDELES_MEGTEKINTES_FEJLEC]).toBe("123.order_A.abcd")
    expect(opciok.headers.authorization).toBe("Bearer x")
  })

  it("süti nélkül nem küld megtekintési fejlécet", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ order: { id: "order_A" } })
    await retrieveOrder("order_A")
    const [, opciok] = sdk.client.fetch.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ]
    expect(RENDELES_MEGTEKINTES_FEJLEC in opciok.headers).toBe(false)
  })
})
