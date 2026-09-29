import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  store: { cart: { addShippingMethod: vi.fn(async () => ({})) } },
}))
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

import { foxpostSzallitasiAdat } from "@lib/util/csomagpont"

import { setShippingMethod } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * A SZALLITASI MOD ADATA (P4-1). MI PIROSIT: ha a Foxpost-csomagpont nem jut
 * el a Medusa-hivasig; ha adat nelkuli modnal ures `data` menne ki.
 */
describe("a szállítási mód beállítása", () => {
  it("a csomagpontot a szállítási mód adatában küldi", async () => {
    await setShippingMethod({
      cartId: "cart_1",
      shippingMethodId: "so_foxpost",
      data: foxpostSzallitasiAdat("HU1"),
    })
    const [cartId, torzs] = sdk.store.cart.addShippingMethod.mock
      .calls[0] as unknown as [string, unknown]
    expect(cartId).toBe("cart_1")
    expect(torzs).toEqual({
      option_id: "so_foxpost",
      data: { foxpost_pickup_point: { id: "HU1" } },
    })
  })

  it("adat nélküli módnál nem küld data mezőt", async () => {
    await setShippingMethod({ cartId: "cart_1", shippingMethodId: "so_gls" })
    const [, torzs] = sdk.store.cart.addShippingMethod.mock.calls[0] as unknown as [
      string,
      unknown,
    ]
    expect(torzs).toEqual({ option_id: "so_gls" })
  })
})
