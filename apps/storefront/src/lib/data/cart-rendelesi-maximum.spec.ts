import { afterEach, describe, expect, it, vi } from "vitest"

const kosarSorok = vi.hoisted(() => ({
  items: [] as { variant_id: string; quantity: number }[],
}))
const sdk = vi.hoisted(() => ({
  client: {
    fetch: vi.fn(async () => ({
      cart: { id: "cart_1", region_id: "reg_1", items: kosarSorok.items },
    })),
  },
  store: { cart: { createLineItem: vi.fn(async () => ({})) } },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "carts"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1" })),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { MENNYISEG_ELUTASITVA } from "@lib/util/kosar-uzenet"
import { addToCart } from "./cart"

afterEach(() => {
  vi.clearAllMocks()
  kosarSorok.items = []
})

const hozzaadott = () =>
  (
    sdk.store.cart.createLineItem.mock.calls as unknown as [
      string,
      { variant_id: string; quantity: number },
    ][]
  ).map(([, sor]) => sor.quantity)

/*
  A KOSARBA TETEL A RENDELESI MAXIMUMIG (kartya 6994c9a3). MI PIROSIT:
  - a kosarban mar levo mennyiseget nem szamolja, es a maximum folott is
    kosarba tesz (ez volt a hiba);
  - a vagast nem mondja ki a vevonek, vagy nem a valodi szammal;
  - tele kosarnal megis hiv;
  - maximum nelkul vag, vagy a Medusa elutasitasat kivetelkent dobja.
*/
describe("kosárba tétel a rendelési maximumig", () => {
  it("a kosárban lévővel együtt vágja a maradékra, és megmondja, miért", async () => {
    kosarSorok.items = [{ variant_id: "v1", quantity: 90 }]
    const eredmeny = await addToCart({
      variantId: "v1",
      quantity: 20,
      countryCode: "hu",
      rendelesiMaximum: 100,
    })
    expect(hozzaadott()).toEqual([10])
    expect(eredmeny).toEqual({
      ok: true,
      megjegyzes:
        "Ebből a termékből egy rendelésbe legfeljebb 100 darab tehető, ezért 10 darabot tettünk a kosárba (90 darab már benne volt).",
    })
  })

  it("tele kosárnál nem hív, hanem kimondja", async () => {
    kosarSorok.items = [
      { variant_id: "v1", quantity: 60 },
      { variant_id: "v1", quantity: 40 },
      { variant_id: "v2", quantity: 5 },
    ]
    const eredmeny = await addToCart({
      variantId: "v1",
      quantity: 10,
      countryCode: "hu",
      rendelesiMaximum: 100,
    })
    expect(sdk.store.cart.createLineItem).not.toHaveBeenCalled()
    expect(eredmeny).toEqual({
      ok: false,
      uzenet:
        "Ebből a termékből egy rendelésbe legfeljebb 100 darab tehető, és 100 darab már a kosaradban van.",
    })
  })

  it("maximum nélkül a kért mennyiség megy; a Medusa elutasítása eredmény, nem kivétel", async () => {
    kosarSorok.items = [{ variant_id: "v1", quantity: 5000 }]
    expect(
      await addToCart({ variantId: "v1", quantity: 7, countryCode: "hu" }),
    ).toEqual({ ok: true })
    expect(hozzaadott()).toEqual([7])

    sdk.store.cart.createLineItem.mockRejectedValueOnce(
      Object.assign(new Error("not allowed"), { status: 400 }),
    )
    expect(
      await addToCart({ variantId: "v1", quantity: 7, countryCode: "hu" }),
    ).toEqual({ ok: false, uzenet: MENNYISEG_ELUTASITVA })
  })
})
