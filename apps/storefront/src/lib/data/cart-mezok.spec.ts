import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn(async () => ({ cart: { id: "cart_1" } })) } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "carts"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({ getRegion: vi.fn() }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { retrieveCart } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * A KOSAR MEZOI. MI PIROSIT: ha a szallitasi mod adata (a Foxpost-csomagpont)
 * kimarad a kosar lekereseebol -- a Medusa bolti alapmezoi kozott nincs benne,
 * es ettol a penztar nem tudta kiirni a kivalasztott pontot (merve a stage-en,
 * 2026-09-29).
 */
describe("a kosár lekérése", () => {
  it("a szállítási mód adatát is kéri", async () => {
    await retrieveCart("cart_1")
    const [, opciok] = sdk.client.fetch.mock.calls[0] as unknown as [
      string,
      { query: { fields: string } },
    ]
    expect(opciok.query.fields.split(",").map((f) => f.trim())).toContain(
      "+shipping_methods.data",
    )
  })
})
