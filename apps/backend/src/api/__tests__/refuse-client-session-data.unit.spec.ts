import middlewares from "../middlewares"
import { refuseClientSessionData } from "../refuse-client-session-data"

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
  refuseClientSessionData({ body } as never, res as never, next)
  return { res, next }
}

const refused = (body: unknown, key: string) => {
  const { res, next } = call(body)
  expect(res.statusCode).toBe(400)
  expect(String((res.sent as { message: string }).message)).toContain(key)
  expect(next).not.toHaveBeenCalled()
}

/**
 * THE CLIENT SETS NO PAYMENT SESSION DATA (the Stripe survey's finding 3/2).
 * What must fail: a client-made session that asks Stripe for an automatic
 * capture, writes the intent's metadata (our webhook filter reads `a:` keys
 * there), picks its own payment method types, or brings the shared payment's
 * facts; the storefront's own call (provider only) refused; the guard not on
 * the store route.
 */
describe("the store payment-session route", () => {
  it("refuses an automatic capture and the intent's metadata from the client", () => {
    refused({ provider_id: "pp_stripe_stripe", data: { capture_method: "automatic" } }, "capture_method")
    refused(
      { provider_id: "pp_stripe_stripe", data: { metadata: { "a:pay_1": "100" } } },
      "metadata"
    )
  })

  it.each([
    "payment_method_types",
    "confirm",
    "setup_future_usage",
    "payment_method",
    // the shared payment's facts, as before
    "stripe_joined",
    "stripe_joint",
    "stripe_share",
  ])("refuses %s in the client's data", (key) => {
    refused({ provider_id: "pp_stripe_stripe", data: { [key]: "x" } }, key)
  })

  it("refuses data that is not an object", () => {
    refused({ provider_id: "pp_stripe_stripe", data: ["capture_method"] }, "data")
    refused({ provider_id: "pp_stripe_stripe", data: "automatic" }, "data")
  })

  it("lets the storefront's own call through: a provider, and no data or an empty one", () => {
    for (const body of [
      { provider_id: "pp_stripe_stripe" },
      { provider_id: "pp_acropora_cod", data: {} },
      { provider_id: "pp_system_default", data: null },
    ]) {
      const { res, next } = call(body)
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  })

  it("guards the store route that creates payment sessions", () => {
    // defineMiddlewares turns `method` into `methods`.
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/payment-collections/:id/payment-sessions" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(refuseClientSessionData)
  })
})
