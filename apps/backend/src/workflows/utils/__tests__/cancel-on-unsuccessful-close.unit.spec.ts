import { cancelOnUnsuccessfulClose, type CancelOnCloseOperations } from "../cancel-on-unsuccessful-close"
import type { CancelOrderFacts } from "../order-cancel-guard"

/**
 * WHAT TURNS THIS RED (card dfb79916; measured on the test shop 2026-11-24: an order closed unsuccessfully kept the customer's
 * 400 points, they came back only through the admin cancel): the unsuccessful close not canceling the order; the cancel
 * running for a move the status table refuses, or before the captured money is refunded; a refused refund or a refused cancel
 * letting the status change go on; another status canceling anything; a shipped order (an open fulfillment), a completed or an
 * already canceled one being canceled again or blocking the close.
 */
const order = (over: Partial<CancelOrderFacts> = {}): CancelOrderFacts => ({
  id: "order_1",
  status: "pending",
  openFulfillments: 0,
  payments: [{ id: "pay_1", outstanding: 0, captured: 0, canceled: false, data: { id: "pi_1" } }],
  pickupPaymentLive: false,
  ...over,
})
const setup = (facts: CancelOrderFacts | null, opts: { refundFails?: string; cancelFails?: string; notAllowed?: boolean } = {}) => {
  const calls: string[] = []
  const ops: CancelOnCloseOperations = {
    load: async () => facts,
    refund: async (id, amount) => {
      calls.push(`refund ${id} ${amount}`)
      if (opts.refundFails) throw new Error(opts.refundFails)
    },
    cancel: async (id) => {
      calls.push(`cancel ${id}`)
      if (opts.cancelFails) throw new Error(opts.cancelFails)
    },
  }
  const assertAllowed = async () => {
    calls.push("assert")
    if (opts.notAllowed) throw new Error("transition refused")
  }
  const run = (to = "closed_unsuccessfully") => cancelOnUnsuccessfulClose({ order_id: "order_1", to }, ops, assertAllowed)
  return { calls, run }
}
const paid = order({ payments: [{ id: "pay_1", outstanding: 22600, captured: 22600, canceled: false, data: { id: "pi_1" } }] })

describe("cancelOnUnsuccessfulClose", () => {
  it("cancels the order after the transition rules passed, and AFTER the captured money is refunded", async () => {
    const { calls, run } = setup(paid)
    expect(await run()).toEqual({ action: "canceled", refunded: [{ paymentId: "pay_1", amount: 22600 }] })
    expect(calls).toEqual(["assert", "refund pay_1 22600", "cancel order_1"])
  })

  it("an order with nothing captured (the points order, an unpaid one) is canceled with no refund", async () => {
    const { calls, run } = setup(order())
    expect(await run()).toEqual({ action: "canceled", refunded: [] })
    expect(calls).toEqual(["assert", "cancel order_1"])
  })

  it("any other status touches nothing, not even the rules", async () => {
    const { calls, run } = setup(paid)
    for (const to of ["closed", "confirmed", "stocking", "out_for_delivery"]) expect(await run(to)).toEqual({ action: "other_status" })
    expect(calls).toEqual([])
  })

  it("a move the status table refuses cancels and refunds nothing", async () => {
    const { calls, run } = setup(paid, { notAllowed: true })
    await expect(run()).rejects.toThrow("transition refused")
    expect(calls).toEqual(["assert"])
  })

  it("a refused refund stops the close with the guard's sentence, and no cancel runs", async () => {
    const { calls, run } = setup(paid, { refundFails: "Stripe refused" })
    await expect(run()).rejects.toThrow(/Stripe refused/)
    expect(calls).not.toContain("cancel order_1")
  })

  it("a refused cancel stops the close, says so, and names what was already refunded", async () => {
    const { run } = setup(paid, { cancelFails: "payment cannot be canceled" })
    await expect(run()).rejects.toThrow(/nincs lemondva, ezért nem is zárható le sikertelenül: payment cannot be canceled\. Ami addig visszatérült \(22600\)/)
  })

  it("an already canceled order goes on to the status with nothing done (a repeat, or the admin got there first)", async () => {
    const { calls, run } = setup(order({ status: "canceled" }))
    expect(await run()).toEqual({ action: "already_canceled" })
    expect(calls).toEqual(["assert"])
  })

  it("a shipped order (an open fulfillment) and a completed one are left as they always were, and the result says so", async () => {
    const shipped = setup(order({ openFulfillments: 1 }))
    expect(await shipped.run()).toEqual({ action: "left_open", reason: "open_fulfillments" })
    expect(shipped.calls).toEqual(["assert"])
    const done = setup(order({ status: "completed" }))
    expect(await done.run()).toEqual({ action: "left_open", reason: "completed" })
  })

  it("an unknown order is left to the status step to answer", async () => {
    const { calls, run } = setup(null)
    expect(await run()).toEqual({ action: "unknown_order" })
    expect(calls).toEqual(["assert"])
  })

  it("a mixed cart's shipped order waiting for its pickup order is refused with the guard's sentence, nothing refunded", async () => {
    const share = { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 25800, own: 17300 } }
    const { calls, run } = setup(
      order({ payments: [{ id: "pay_1", outstanding: 0, captured: 0, canceled: false, data: share }], pickupPaymentLive: true })
    )
    await expect(run()).rejects.toThrow(/vegyes kosár/)
    expect(calls).toEqual(["assert"])
  })
})
