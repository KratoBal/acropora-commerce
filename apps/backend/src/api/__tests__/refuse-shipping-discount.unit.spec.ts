import middlewares from "../middlewares"
import { SHIPPING_DISCOUNT_REFUSAL, refuseShippingDiscount } from "../refuse-shipping-discount"

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
  refuseShippingDiscount({ body } as never, res as never, next)
  return { res, next }
}

/**
 * NO DISCOUNT ON SHIPPING (card 790da0cd). What must fail: a promotion aimed
 * at the shipping goes through on create or on update; a product discount
 * (items, order) is refused; the guard is missing from either admin route.
 */
describe("discounts come off the products only", () => {
  it("refuses a shipping-target promotion, created or changed", () => {
    for (const body of [
      { code: "INGYENSZALLITAS", application_method: { type: "percentage", value: 100, target_type: "shipping_methods" } },
      { application_method: { target_type: "shipping_methods" } },
    ]) {
      const { res, next } = call(body)
      expect(res.statusCode).toBe(400)
      expect(res.sent).toEqual({ type: "invalid_data", message: SHIPPING_DISCOUNT_REFUSAL })
      expect(next).not.toHaveBeenCalled()
    }
  })

  it("lets a product discount and an edit without the method through", () => {
    for (const body of [
      { code: "TIZ", application_method: { type: "percentage", value: 10, target_type: "order" } },
      { application_method: { target_type: "items" } },
      { status: "active" },
      undefined,
    ]) {
      const { res, next } = call(body)
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  })

  it("stands on both admin routes", () => {
    for (const matcher of ["/admin/promotions", "/admin/promotions/:id"]) {
      const routes = (middlewares.routes ?? []).filter((r) => r.matcher === matcher)
      expect(routes.some((r) => (r.middlewares ?? []).includes(refuseShippingDiscount as never))).toBe(true)
    }
  })
})
