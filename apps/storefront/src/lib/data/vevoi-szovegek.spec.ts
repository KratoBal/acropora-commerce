// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.unmock("@lib/data/vevoi-szovegek")
vi.mock("server-only", () => ({}))
const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))

import { vevoiSzovegek } from "./vevoi-szovegek"

/**
 * AZ OS-BEN ÁTÍRT VEVŐI SZÖVEGEK LEKÉRÉSE (kártya 7bfca4eb).
 *
 * MI PIROSÍT: a nyelv nem megy át a kérésben; a címke nem a `customer-texts` (az OS mentése akkor nem üríti); egy hiba kivételt dob,
 * és vele a teljes kirakat és a pénztár leesik; egy 5xx némán, napló nélkül lesz üres.
 */
describe("a vevői szövegek lekérése", () => {
  beforeEach(() => {
    sdk.client.fetch.mockReset()
    vi.restoreAllMocks()
  })

  it("a lap nyelvén kér, a közös címkével, és a felülírásokat adja", async () => {
    sdk.client.fetch.mockResolvedValueOnce({
      customer_texts: { "cart.add": "Kosárba vele" },
    })
    expect(await vevoiSzovegek("en")).toEqual({ "cart.add": "Kosárba vele" })
    const [ut, opcio] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/customer-texts")
    expect(opcio.query).toEqual({ locale: "en" })
    expect(opcio.next.tags).toEqual(["customer-texts"])
    expect(opcio.next.revalidate).toBeGreaterThan(0)
  })

  it("üres válasz, 404 és minden más hiba is üres (a szótár szövege marad); a nem-404 hiba naplóba kerül", async () => {
    const naplo = vi.spyOn(console, "error").mockImplementation(() => {})
    sdk.client.fetch.mockResolvedValueOnce({ customer_texts: null })
    expect(await vevoiSzovegek("hu")).toEqual({})
    sdk.client.fetch.mockRejectedValueOnce({ status: 404 })
    expect(await vevoiSzovegek("hu")).toEqual({})
    expect(naplo).not.toHaveBeenCalled()
    sdk.client.fetch.mockRejectedValueOnce({ status: 500 })
    expect(await vevoiSzovegek("hu")).toEqual({})
    sdk.client.fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))
    expect(await vevoiSzovegek("hu")).toEqual({})
    expect(naplo).toHaveBeenCalledTimes(2)
  })
})
