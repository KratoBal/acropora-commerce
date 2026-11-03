import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "carts"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({ getRegion: vi.fn() }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { mentsRendelesiNyelvet } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * A VEVO NYELVE A KOSARRA (kartya d5c6befd). MI PIROSIT: ha nem a sajat
 * hatter-vegpontra menne (a nyers kosar-frissites a tobbi metaadatot is
 * irhatna, es a hatter el is utasitja); ha a nyelv helyett mas mezo menne; ha
 * a hiba dobaskent szokne ki a fizetesi gombhoz es megallitana a fizetest.
 */
describe("mentsRendelesiNyelvet", () => {
  it("a saját végpontra küldi, csak a nyelvet", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ locale: "en" })
    expect(await mentsRendelesiNyelvet("cart_1", "en")).toEqual({ ok: true })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/cart-locale/cart_1", {
      method: "POST",
      body: { locale: "en" },
      headers: { authorization: "Bearer x" },
    })
  })

  it("a hiba nem dobás: a fizetés a hívónál tovább mehet", async () => {
    sdk.client.fetch.mockRejectedValueOnce(new Error("503"))
    expect(await mentsRendelesiNyelvet("cart_1", "hu")).toEqual({ ok: false })
  })
})
