import type { AszfDokumentumAllapot } from "@lib/util/aszf"
import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  client: { fetch: vi.fn() },
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
const dokumentum = vi.hoisted(() => ({
  aszfDokumentumMost: vi.fn(async (): Promise<AszfDokumentumAllapot> => ({
    tipus: "fogyasztobarat",
    hatalyos: "2026-10-05",
    lenyomat: null,
  })),
}))
vi.mock("./aszf-dokumentum", () => dokumentum)

import {
  ASZF_FORRAS,
  ASZF_FORRAS_MAI_BOLT,
  ASZF_VERZIO,
  ASZF_VERZIO_MAI_BOLT,
} from "@lib/util/aszf"

import { rogzitsAszfElfogadast } from "./cart"

afterEach(() => vi.clearAllMocks())

/**
 * AZ ASZF-REKORD A KOSARON (kartya 4a2b252d). MI PIROSIT: ha a rekord nem a
 * regisztracioeval azonos alaku (idopont, verzio, dokumentum); ha a kosar mas
 * metaadat-kulcsai elvesznek (a vegyes kosar szulo-azonositoja is ott el); ha
 * a hiba dobaskent szokne ki a fizetesi gombhoz.
 */
describe("az ÁSZF elfogadásának rögzítése", () => {
  it("a regisztrációéval azonos rekordot írja, a többi kulcs marad", async () => {
    sdk.client.fetch.mockResolvedValueOnce({
      cart: { id: "cart_1", metadata: { acropora_pickup_cart_id: "cart_2" } },
    })
    expect(await rogzitsAszfElfogadast("cart_1")).toEqual({ ok: true })
    const [id, torzs] = sdk.store.cart.update.mock.calls[0] as unknown as [
      string,
      { metadata: Record<string, unknown> },
    ]
    expect(id).toBe("cart_1")
    expect(torzs.metadata.acropora_pickup_cart_id).toBe("cart_2")
    // a lekeres nem adott lenyomatot: a rekord kimondja, hogy nincs
    expect(torzs.metadata.aszf_elfogadas).toEqual({
      idopont: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      verzio: ASZF_VERZIO,
      dokumentum: ASZF_FORRAS,
      hatalyos: "2026-10-05",
      lenyomat: "nincs",
    })
  })

  it("kikapcsolt Fogyasztóbarátnál a mai bolt ÁSZF-je kerül a kosárra (4a2b252d)", async () => {
    dokumentum.aszfDokumentumMost.mockResolvedValueOnce({ tipus: "mai-bolt" })
    sdk.client.fetch.mockResolvedValueOnce({
      cart: { id: "cart_1", metadata: null },
    })
    expect(await rogzitsAszfElfogadast("cart_1")).toEqual({ ok: true })
    const [, torzs] = sdk.store.cart.update.mock.calls[0] as unknown as [
      string,
      { metadata: Record<string, unknown> },
    ]
    expect(torzs.metadata.aszf_elfogadas).toEqual({
      idopont: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      verzio: ASZF_VERZIO_MAI_BOLT,
      dokumentum: ASZF_FORRAS_MAI_BOLT,
    })
  })

  it("hibánál visszaadott üzenet, nem dobás", async () => {
    sdk.client.fetch.mockResolvedValueOnce({
      cart: { id: "cart_1", metadata: null },
    })
    sdk.store.cart.update.mockRejectedValueOnce(new Error("hálózat"))
    const eredmeny = await rogzitsAszfElfogadast("cart_1")
    expect(eredmeny.ok).toBe(false)
  })
})
