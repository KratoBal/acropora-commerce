import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
const nav = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock("next/navigation", () => nav)
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "tag"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({ getRegion: vi.fn() }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))

import { placeOrder } from "./cart"

const valaszok = (split: unknown) =>
  sdk.client.fetch.mockImplementation(async (ut: string) => {
    if (ut.endsWith("/complete-split")) {
      if (split instanceof Error) throw split
      return split
    }
    if (ut.startsWith("/store/carts/"))
      return {
        cart: { id: "cart_1", shipping_address: { country_code: "HU" } },
      }
    throw new Error(`váratlan út: ${ut}`)
  })

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}))
afterEach(() => vi.clearAllMocks())

/**
 * A LEADÁS (P4-2b). MI PIROSIT: ha nem a bontó utat hívja; ha nem az első (a
 * kiszállított) rendelésre visz; ha az országkódot nem a leadás előtt olvassa;
 * ha egy elutasított leadás sikernek látszik.
 */
describe("a rendelés leadása", () => {
  it("a bontó utat hívja, és az első rendelés visszaigazolására visz", async () => {
    valaszok({
      orders: [
        { id: "order_1", display_id: 12 },
        { id: "order_2", display_id: 13 },
      ],
      pending_pickup_cart_id: null,
    })
    await placeOrder("cart_1")
    const utak = sdk.client.fetch.mock.calls.map(([ut]) => ut)
    expect(utak).toContain("/store/carts/cart_1/complete-split")
    expect(utak.indexOf("/store/carts/cart_1")).toBeLessThan(
      utak.indexOf("/store/carts/cart_1/complete-split"),
    )
    expect(nav.redirect).toHaveBeenCalledWith("/hu/order/order_1/confirmed")
  })

  it("függő bolti rendelésnél is a meglévő rendelésre visz", async () => {
    valaszok({
      orders: [{ id: "order_1", display_id: 12 }],
      pending_pickup_cart_id: "cart_pickup_1",
    })
    await placeOrder("cart_1")
    expect(nav.redirect).toHaveBeenCalledWith("/hu/order/order_1/confirmed")
  })

  it("elutasított leadásnál magyar hibát ad, és nem visz sehova", async () => {
    valaszok(new Error("This cart has pickup-only and shipped items together"))
    const eredmeny = await placeOrder("cart_1")
    expect(eredmeny.ok).toBe(false)
    expect(nav.redirect).not.toHaveBeenCalled()
  })
})
