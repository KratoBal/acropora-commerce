import middlewares from "../middlewares"
import { refuseClientSimplePayKeys } from "../refuse-client-simplepay-keys"

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
  refuseClientSimplePayKeys({ body } as never, res as never, next)
  return { res, next }
}

/**
 * THE CLIENT CANNOT NAME A SIMPLEPAY TRANSACTION (P4-3c). What must fail: a
 * client-made payment session that joins another transaction, sets its own
 * joint total, or brings its own SimplePay facts; an ordinary session refused;
 * the guard not on the store route.
 */
describe("the store payment-session route", () => {
  it.each(["simplepay_joined", "simplepay_joint", "simplepay"])("refuses %s in the client's data", (key) => {
    const { res, next } = call({ provider_id: "pp_simplepay_simplepay", data: { [key]: { transactionId: 1 } } })
    expect(res.statusCode).toBe(400)
    expect(String((res.sent as { message: string }).message)).toContain(key)
    expect(next).not.toHaveBeenCalled()
  })

  it("lets an ordinary session through", () => {
    const { res, next } = call({ provider_id: "pp_simplepay_simplepay", data: { customer_email: "a@b.hu", invoice: {} } })
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
    expect(route?.middlewares).toContain(refuseClientSimplePayKeys)
  })
})
