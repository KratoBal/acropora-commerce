import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock("@lib/config", () => ({ sdk: { client: { fetch: sdk.fetch } } }))
vi.mock("@lib/data/cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  setCartId: vi.fn(async () => {}),
}))
vi.mock("@lib/data/cart", () => ({
  placeOrder: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@lib/data/stripe", () => ({
  stripeVisszarendezes: vi.fn(async () => {}),
}))

import { placeOrder } from "@lib/data/cart"
import { stripeVisszarendezes } from "@lib/data/stripe"
import { GET } from "../route"

afterEach(() => vi.clearAllMocks())

const keres = (status: string) =>
  new NextRequest(
    `https://shop.example/api/payment-return?cart_id=cart-1&country_code=hu&payment_intent=pi_1&payment_intent_client_secret=cs_1&redirect_status=${status}`,
  )

/**
 * A 3-D SECURE UTÁNI VISSZATÉRÉS (Balázs 2026-10-01, vegyes kosár). MI
 * PIROSÍT: ha egy sikertelen visszatérés után a vegyes kosár bontva, a
 * zárolás a kártyán maradna; ha egy sikeres visszatérés is visszarendezne.
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
    expect(stripeVisszarendezes).toHaveBeenCalledWith("cart-1")
    expect(valasz.headers.get("location")).toContain(
      "/hu/checkout?step=payment",
    )
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("sikeres fizetés: nem rendez vissza, lead", async () => {
    await GET(keres("succeeded")).catch(() => undefined)
    expect(stripeVisszarendezes).not.toHaveBeenCalled()
    expect(placeOrder).toHaveBeenCalled()
  })
})
