import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  client: { fetch: vi.fn() },
  store: {
    cart: { createLineItem: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
const fejlec = vi.hoisted(() => ({ ip: "198.51.100.1" as string | null }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers(fejlec.ip ? { "x-real-ip": fejlec.ip } : {}),
}))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "tag"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1" })),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))

import { translator } from "@lib/i18n/dictionary"
import { LATOGATO_FOGLALAS_KORLAT } from "@lib/util/kosar-foglalas"

import { addToCart } from "./cart"

const hu = translator("hu")

/** A bolt: a kosar, es a `GET /store/cart-holds` valasza erre a darabra. */
const bolt = (darab: unknown) =>
  sdk.client.fetch.mockImplementation(async (ut: string) => {
    if (ut.startsWith("/store/cart-holds")) {
      if (darab instanceof Error) throw darab
      return { on: true, pieces: [darab] }
    }
    if (ut.startsWith("/store/carts/"))
      return { cart: { id: "cart_1", region_id: "reg_1" } }
    throw new Error(`váratlan út: ${ut}`)
  })
const kosarba = () =>
  addToCart({ variantId: "v_piece", quantity: 1, countryCode: "hu" })
let ip = 0
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  fejlec.ip = `198.51.100.${++ip}` // minden teszt sajat latogato: a keret a modulban el
})
afterEach(() => vi.clearAllMocks())

/**
 * A KOSARBA TETEL A FOGLALASSAL (V2.3 S2b). MI PIROSIT: a latogato a keretnel tobb UJ egyedi
 * darabot tehet kosarba; a sajat vagy a masik kosarban allo darab fogy a keretbol; a fejlec
 * nelkuli vagy a valasz nelkuli kerest korlatozzuk; a bolt harom elutasitasa a mai mondatot kapja.
 */
describe("a latogatonkenti keret", () => {
  it("a keretnyi uj egyedi darab utan a kovetkezot a kirakat utasitja el, a bolthoz nem megy", async () => {
    bolt({ variant_id: "v_piece", unique: true, hold: null })
    for (let i = 0; i < LATOGATO_FOGLALAS_KORLAT.max; i++)
      expect(await kosarba()).toEqual({ ok: true })
    expect(await kosarba()).toEqual({
      ok: false,
      uzenet: hu("product.holdVisitorLimit"),
    })
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(
      LATOGATO_FOGLALAS_KORLAT.max,
    )
    // masik latogato: a sajat kerete
    fejlec.ip = "203.0.113.9"
    expect(await kosarba()).toEqual({ ok: true })
  })

  it("a sajat foglalasu, a masik kosarban allo es a nem egyedi darab nem fogy a keretbol", async () => {
    for (const darab of [
      {
        variant_id: "v_piece",
        unique: true,
        hold: { until: "2099-01-01T00:00:00.000Z", mine: true },
      },
      {
        variant_id: "v_piece",
        unique: true,
        hold: { until: "2099-01-01T00:00:00.000Z", mine: false },
      },
      { variant_id: "v_piece", unique: false, hold: null },
    ]) {
      bolt(darab)
      for (let i = 0; i <= LATOGATO_FOGLALAS_KORLAT.max; i++) await kosarba()
    }
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(
      3 * (LATOGATO_FOGLALAS_KORLAT.max + 1),
    )
  })

  it("fejlec nelkul, vagy ha a bolt nem valaszol, nem korlatoz", async () => {
    fejlec.ip = null
    bolt({ variant_id: "v_piece", unique: true, hold: null })
    for (let i = 0; i <= LATOGATO_FOGLALAS_KORLAT.max; i++) await kosarba()
    fejlec.ip = "203.0.113.77"
    bolt(new Error("503"))
    for (let i = 0; i <= LATOGATO_FOGLALAS_KORLAT.max; i++) await kosarba()
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(
      2 * (LATOGATO_FOGLALAS_KORLAT.max + 1),
    )
  })
})

describe("a bolt elutasitasa a kosarba tetelnel", () => {
  it("a foglalas harom kodja a sajat mondatat kapja, mas hiba a mait", async () => {
    bolt({ variant_id: "v_piece", unique: true, hold: null })
    const esetek: [string, string][] = [
      ['cart_hold_limit:{"max":5}', hu("product.holdLimit", { max: 5 })],
      [
        'unique_piece_busy:[{"title":"A","handle":"a"}]',
        hu("product.holdBusy"),
      ],
      [
        "Variant does not have the required inventory",
        hu("product.cartFailed"),
      ],
    ]
    for (const [uzenet, vart] of esetek) {
      sdk.store.cart.createLineItem.mockRejectedValueOnce(new Error(uzenet))
      expect(await kosarba()).toEqual({ ok: false, uzenet: vart })
    }
  })
})
