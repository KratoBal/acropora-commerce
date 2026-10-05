import middlewares from "../middlewares"
import { refuseClientCardShareKeys } from "../refuse-client-card-share-keys"

const call = (body: unknown) => {
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
  refuseClientCardShareKeys({ body } as never, res as never, next)
  return { res, next }
}

/**
 * THE CLIENT CANNOT NAME A SHARED CARD PAYMENT (P4-3c). What must fail: a
 * client-made payment session that joins another PaymentIntent, sets its own
 * joint total, or brings its own share facts; an ordinary session refused;
 * the guard not on the store route.
 */
describe("the store payment-session route", () => {
  it.each([
    "stripe_joined",
    "stripe_joint",
    "stripe_share",
  ])("refuses %s in the client's data", (key) => {
    const { res, next } = call({ provider_id: "pp_stripe_stripe", data: { [key]: { transactionId: "pi_1" } } })
    expect(res.statusCode).toBe(400)
    expect(String((res.sent as { message: string }).message)).toContain(key)
    expect(next).not.toHaveBeenCalled()
  })

  it("lets an ordinary session through", () => {
    const { res, next } = call({ provider_id: "pp_stripe_stripe", data: { payment_description: "x" } })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
    expect(call({ provider_id: "pp_acropora_cod" }).next).toHaveBeenCalledTimes(1)
  })

  it("guards the store route that creates payment sessions", () => {
    // defineMiddlewares turns `method` into `methods`.
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/payment-collections/:id/payment-sessions" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(refuseClientCardShareKeys)
  })
})
