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

import { MEGJEGYZES_MENTES_HIBA } from "@lib/util/penztar-uzenet"

import { mentsMegjegyzeseket } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * A MEGJEGYZESEK MENTESE (kartya d3b54954). MI PIROSIT: ha nem a sajat
 * hatter-vegpontra menne (a nyers kosar-frissites a tobbi metaadatot is
 * irhatna); ha a hiba dobaskent szokne ki a szallitasi lepesbe.
 */
describe("mentsMegjegyzeseket", () => {
  it("a saját végpontra küldi, csak a két mezőt", async () => {
    sdk.client.fetch.mockResolvedValueOnce({
      customer_note: "x",
      carrier_note: null,
    })
    expect(await mentsMegjegyzeseket("cart_1", { customer_note: "x" })).toEqual(
      { ok: true },
    )
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/cart-notes/cart_1", {
      method: "POST",
      body: { customer_note: "x" },
      headers: { authorization: "Bearer x" },
    })
  })

  it("a hiba magyar üzenet, nem dobás", async () => {
    sdk.client.fetch.mockRejectedValueOnce(new Error("409"))
    expect(await mentsMegjegyzeseket("cart_1", { customer_note: "x" })).toEqual(
      {
        ok: false,
        uzenet: MEGJEGYZES_MENTES_HIBA,
      },
    )
  })
})
