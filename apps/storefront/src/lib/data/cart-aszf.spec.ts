import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  client: { fetch: vi.fn(async (..._args: unknown[]) => ({})) },
  store: { cart: { update: vi.fn(async () => ({ cart: {} })) } },
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

import { rogzitsAszfElfogadast } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * AZ ASZF-ELFOGADAS A SZERVER VEGPONTJAN KERESZTUL MEGY (audit A4). MI PIROSIT:
 * ha a kirakat ujra maga allitana ossze a rekordot (idopont, verzio, dokumentum)
 * vagy a gyari `cart.update` hivassal irna a kosar metaadatat; ha a vegpont nem
 * a path-beli kosarra mutat; ha a hiba (a 501 is) dobaskent szokne ki a
 * fizetesi gombhoz. A rekord tartalmat a hatter tesztjei fedik
 * (`aszf-record.unit.spec.ts`): a mai-bolt es a Fogyasztobarat ag szerinti
 * szetvalasztas ott el.
 */
describe("az ÁSZF elfogadásának rögzítése", () => {
  it("a szerver végpontját hívja, csak a vevő szavával, és nem ír kosár-metaadatot", async () => {
    expect(await rogzitsAszfElfogadast("cart_1")).toEqual({ ok: true })
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
    const [url, opciok] = sdk.client.fetch.mock.calls[0] as unknown as [
      string,
      { method: string; body: unknown; headers: Record<string, string> },
    ]
    expect(url).toBe("/store/carts/cart_1/aszf-elfogadas")
    expect(opciok.method).toBe("POST")
    // se időpont, se verzió, se dokumentum: azt a szerver adja
    expect(opciok.body).toEqual({ elfogadom: true })
    expect(opciok.headers.authorization).toBe("Bearer x")
    expect(sdk.store.cart.update).not.toHaveBeenCalled()
  })

  it("kosár-azonosító nélkül a süti kosarát használja", async () => {
    expect(await rogzitsAszfElfogadast()).toEqual({ ok: true })
    expect(sdk.client.fetch.mock.calls[0]![0]).toBe(
      "/store/carts/cart_1/aszf-elfogadas",
    )
  })

  it("hibánál (a szerver 501-e is) visszaadott üzenet, nem dobás", async () => {
    sdk.client.fetch.mockRejectedValueOnce(new Error("501"))
    const eredmeny = await rogzitsAszfElfogadast("cart_1")
    expect(eredmeny.ok).toBe(false)
  })
})
