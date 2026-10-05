import { type AdminCaptureFacts, guardAdminCapture } from "../admin-capture-guard"

/**
 * AN ADMIN CAPTURE TAKES THE ORDER'S CURRENT TOTAL (acrobot 26265; stage
 * 2026-10-05, #36: 10 000 captured of a 14 000 order, 4 000 released for good).
 *
 * What must fail: a smaller or a larger amount let through; a left-out amount
 * not measured; the refusal not naming the order edit as the way to a smaller
 * capture; a mixed cart's payment measured against the pair's sum instead of
 * its own order; a non-Stripe or an already captured payment stopped here.
 */
const facts = (over: Partial<AdminCaptureFacts> = {}): AdminCaptureFacts => ({
  provider_id: "pp_stripe_stripe",
  amount: 14000,
  captured: 0,
  order: { id: "order_36", total: 14000 },
  ...over,
})

const guard = (requested: number | undefined, loaded: AdminCaptureFacts | null) =>
  guardAdminCapture("pay_1", requested, { load: async () => loaded })

describe("the admin capture of a card payment", () => {
  it("the order's current total passes, asked for or left out", async () => {
    expect(await guard(14000, facts())).toEqual({ action: "pass" })
    expect(await guard(undefined, facts())).toEqual({ action: "pass" })
  })

  // MI PIROSÍT: a #36-os eset, ha az őr nem állna a kisebb összeg útjába
  it("a smaller amount is refused, and the message names the order edit", async () => {
    const result = await guard(10000, facts())
    expect(result.action).toBe("refuse")
    const message = (result as { message: string }).message
    expect(message).toContain("Kisebb összeget nem lehet levonni")
    expect(message).toContain("14000 Ft")
    expect(message).toContain("szerkeszd a rendelést")
  })

  it("a larger amount is refused", async () => {
    const result = await guard(14001, facts())
    expect(result.action).toBe("refuse")
    expect((result as { message: string }).message).toContain("Többet nem lehet levonni")
  })

  it("a left-out amount is the payment's: a hold above the order's total is refused", async () => {
    const result = await guard(undefined, facts({ amount: 14000, order: { id: "order_36", total: 10500 } }))
    expect(result.action).toBe("refuse")
  })

  it("after a confirmed edit the order's total is the smaller amount, and that passes", async () => {
    expect(await guard(10500, facts({ order: { id: "order_36", total: 10500 } }))).toEqual({ action: "pass" })
  })

  it("a mixed cart's payment is measured against its own order, not the pair", async () => {
    const pickup = facts({ amount: 8500, order: { id: "order_38", total: 8500 } })
    expect(await guard(8500, pickup)).toEqual({ action: "pass" })
    expect((await guard(22500, pickup)).action).toBe("refuse")
    expect((await guard(8000, pickup)).action).toBe("refuse")
  })

  it("leaves other providers, unknown and captured payments to Medusa and the provider", async () => {
    expect(await guard(100, facts({ provider_id: "pp_acropora-payment_cod" }))).toEqual({ action: "pass" })
    expect(await guard(100, null)).toEqual({ action: "pass" })
    expect(await guard(100, facts({ captured: 10000 }))).toEqual({ action: "pass" })
  })

  it("a card payment without an order is refused: there is nothing to measure", async () => {
    const result = await guard(14000, facts({ order: null }))
    expect(result.action).toBe("refuse")
  })
})
