import { aszfBeforeCardStart, aszfBeforePlaceOrder } from "../require-aszf-acceptance"
import middlewares from "../middlewares"

const call = async (mw: typeof aszfBeforeCardStart, cart: unknown) => {
  const res = {
    statusCode: 0,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(b: unknown) {
      this.sent = b
    },
  }
  const next = jest.fn()
  const scope = { resolve: () => ({ graph: async () => ({ data: cart ? [cart] : [] }) }) }
  await mw({ params: { id: "cart_1" }, scope } as never, res as never, next)
  return { res, next }
}

/**
 * MI PIROSÍT: ha a stripe-start vagy a complete-split útvonalán nem állna az
 * őr; ha rekord nélküli kosárral a következő lépés (a PaymentIntent, a leadás)
 * mégis lefutna.
 */
describe("the ÁSZF net on the store routes", () => {
  it("a cart without the record: 400, the route does not run", async () => {
    for (const mw of [aszfBeforeCardStart, aszfBeforePlaceOrder]) {
      const { res, next } = await call(mw, { id: "cart_1", metadata: null, payment_collection: null })
      expect(res.statusCode).toBe(400)
      expect((res.sent as { message: string }).message).toBe(
        "Az ÁSZF elfogadása nélkül a rendelés nem adható le."
      )
      expect(next).not.toHaveBeenCalled()
    }
  })

  it("with the record the route runs", async () => {
    const { next } = await call(aszfBeforeCardStart, {
      id: "cart_1",
      metadata: { aszf_elfogadas: { idopont: "2026-10-05T13:30:00.000Z" } },
    })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("guards stripe-start and complete-split", () => {
    const on = (matcher: string) =>
      (middlewares.routes ?? []).find(
        (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
      )?.middlewares
    expect(on("/store/carts/:id/stripe-start")).toContain(aszfBeforeCardStart)
    expect(on("/store/carts/:id/complete-split")).toContain(aszfBeforePlaceOrder)
  })
})
