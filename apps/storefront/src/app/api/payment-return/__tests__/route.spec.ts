import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock("@lib/config", () => ({ sdk: { client: { fetch: sdk.fetch } } }))
vi.mock("@lib/data/cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async (tag: string) => `${tag}-cimke`),
  setCartId: vi.fn(async () => {}),
}))
// a Next 16-ban az `updateTag` route handlerben HIBAT DOB (csak szerver-akcioban el): a mock ezt adja vissza, hogy egy route-bol elerheto updateTag piros legyen
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(() => {
    throw new Error("updateTag csak szerver-akcioban hasznalhato")
  }),
}))
vi.mock("@lib/data/cart", () => ({
  placeOrder: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@lib/data/stripe-visszarendezes", () => ({
  stripeVisszarendezesHivas: vi.fn(async () => {}),
}))

import { placeOrder } from "@lib/data/cart"
import { stripeVisszarendezesHivas } from "@lib/data/stripe-visszarendezes"
import { revalidateTag, updateTag } from "next/cache"
import { GET } from "../route"

afterEach(() => vi.clearAllMocks())

const keres = (status: string) =>
  new NextRequest(
    `https://shop.example/api/payment-return?cart_id=cart-1&country_code=hu&payment_intent=pi_1&payment_intent_client_secret=cs_1&redirect_status=${status}`,
  )

/**
 * A 3-D SECURE UTÁNI VISSZATÉRÉS (Balázs 2026-10-01, vegyes kosár). MI
 * PIROSÍT: ha egy sikertelen visszatérés után a vegyes kosár bontva, a
 * zárolás a kártyán maradna; ha egy sikeres visszatérés is visszarendezne;
 * ha a route `updateTag`-et ér el (Next 16: route handlerben hibát dob, a vevő szerverhibát kap).
 */
describe("GET /api/payment-return", () => {
  sdk.fetch.mockResolvedValue({
    cart: {
      payment_collection: {
        payment_sessions: [{ data: { id: "pi_1", client_secret: "cs_1" } }],
      },
    },
  })

  it("sikertelen fizetés: a kosár visszarendeződik, a vevő a fizetési lépésre jut", async () => {
    const valasz = await GET(keres("failed"))
    expect(stripeVisszarendezesHivas).toHaveBeenCalledWith("cart-1")
    // route handler: azonnali lejarat, NEM updateTag (az itt dobna, a vevo szerverhibat kapna a fizetesi lepes helyett)
    expect(revalidateTag).toHaveBeenCalledWith("carts-cimke", { expire: 0 })
    expect(updateTag).not.toHaveBeenCalled()
    expect(valasz.headers.get("location")).toContain(
      "/hu/checkout?step=payment",
    )
    expect(placeOrder).not.toHaveBeenCalled()
  })

  /*
    A REDESIGN OTA (2026-10-05) A SIKERES VISSZATERES NEM ITT AD LE, hanem a
    fizetesi lepes "Ellenőrzés…" allapotaba visz (477:619), es a leadas ott
    fut. MI PIROSIT: ha az utvonal ujra maga adna le (a vevo nem latna az
    ellenorzest), vagy ha nem az ellenorzes jelzesevel vinne vissza.
  */
  it("sikeres fizetés: nem rendez vissza, és az ellenőrzés állapotába visz", async () => {
    const valasz = await GET(keres("succeeded"))
    expect(stripeVisszarendezesHivas).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(placeOrder).not.toHaveBeenCalled()
    const cel = new URL(valasz.headers.get("location") ?? "")
    expect(cel.pathname).toBe("/hu/checkout")
    expect(cel.searchParams.get("step")).toBe("payment")
    expect(cel.searchParams.get("ellenorzes")).toBe("1")
  })
})
