import {
  cancelOnUnsuccessfulClose,
  refuseReopenAfterMovement,
  reopenRefusalOf,
  type CancelOnCloseOperations,
  type ReopenOperations,
} from "../cancel-on-unsuccessful-close"
import type { CancelOrderFacts } from "../order-cancel-guard"

/**
 * WHAT TURNS THIS RED (card dfb79916; measured on the test shop 2026-11-24: an order closed unsuccessfully kept the customer's
 * 400 points, they came back only through the admin cancel): the unsuccessful close not canceling the order; the cancel
 * running for a move the status table refuses, or before the captured money is refunded; a refused refund or a refused cancel
 * letting the status change go on; another status canceling anything; a shipped order (an open fulfillment: the MAIN case, a
 * returned parcel) or a completed one not giving its points and card back directly, or being cancelled, or blocking the close;
 * an already canceled one being canceled again or giving back twice.
 */
const order = (over: Partial<CancelOrderFacts> = {}): CancelOrderFacts => ({
  id: "order_1",
  status: "pending",
  openFulfillments: 0,
  payments: [{ id: "pay_1", outstanding: 0, captured: 0, canceled: false, data: { id: "pi_1" } }],
  pickupPaymentLive: false,
  ...over,
})
const setup = (
  facts: CancelOrderFacts | null,
  opts: { refundFails?: string; cancelFails?: string; notAllowed?: boolean; creditLines?: number } = {}
) => {
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
    giveBackCredits: async (id) => {
      calls.push(`give back ${id}`)
      return opts.creditLines ?? 2
    },
    markGivenBack: async (id, trace) => void calls.push(`mark ${id} ${trace.credit_lines} ${trace.captured_unrefunded}`),
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

  it("an already canceled order goes on to the status with nothing done (a repeat, or the admin got there first): no second give-back", async () => {
    const { calls, run } = setup(order({ status: "canceled" }))
    expect(await run()).toEqual({ action: "already_canceled" })
    expect(calls).toEqual(["assert"])
  })

  it("a shipped order (an open fulfillment) and a completed one cannot be canceled: the close goes on and the credits are given back DIRECTLY", async () => {
    const shipped = setup(order({ openFulfillments: 1 }))
    expect(await shipped.run()).toEqual({ action: "credits_given_back", reason: "open_fulfillments", credit_lines: 2, captured_unrefunded: 0 })
    expect(shipped.calls).toEqual(["assert", "give back order_1", "mark order_1 2 0"])
    const done = setup(order({ status: "completed" }))
    expect(await done.run()).toEqual({ action: "credits_given_back", reason: "completed", credit_lines: 2, captured_unrefunded: 0 })
    expect(done.calls).toEqual(["assert", "give back order_1", "mark order_1 2 0"])
  })

  it("a shipped order with a captured card payment gets nothing refunded: that stays a hand job, and the marker CARRIES the amount", async () => {
    const { calls, run } = setup(order({ openFulfillments: 1, payments: paid.payments }))
    expect(await run()).toMatchObject({ captured_unrefunded: 22600 })
    expect(calls.some((c) => c.startsWith("refund"))).toBe(false)
    expect(calls).toContain("mark order_1 2 22600")
  })

  it("a shipped order with NO points or card (nothing moved) is NOT marked: it stays reopenable, as before", async () => {
    const { calls, run } = setup(order({ openFulfillments: 1 }), { creditLines: 0 })
    expect(await run()).toMatchObject({ action: "credits_given_back", credit_lines: 0 })
    expect(calls.some((c) => c.startsWith("mark"))).toBe(false)
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

/**
 * WHAT TURNS THIS RED (barracuda 60883, acrobot 60885): the way back from "Sikertelenül lezárt" to "Készletezés" open after the
 * close canceled the order or gave the points and the card back (a canceled order shipping again, earning points on closing);
 * the refusal reaching a move that is not the reopening, or an order the close moved nothing on (an old label-only close).
 */
describe("refuseReopenAfterMovement", () => {
  const reopen = (state: { status?: string | null; order?: string | null; marker?: boolean }) => {
    const ops: ReopenOperations = {
      currentStatus: async () => (state.status === undefined ? "closed_unsuccessfully" : state.status),
      orderStatus: async () => (state.order === undefined ? "pending" : state.order),
      givenBackMarker: async () => state.marker === true,
    }
    return (to = "stocking") => refuseReopenAfterMovement({ order_id: "order_1", to }, ops)
  }

  it("refuses the reopening of a canceled order, and says what to do", async () => {
    await expect(reopen({ order: "canceled" })()).rejects.toThrow(/le lett mondva.*új rendelés kell/)
  })

  it("refuses the reopening of an order whose points or card went back (the marker)", async () => {
    await expect(reopen({ marker: true })()).rejects.toThrow(/visszajárt.*új rendelés kell/)
  })

  it("an order the close moved nothing on (not canceled, no marker) can still be reopened", async () => {
    await expect(reopen({})()).resolves.toBeUndefined()
  })

  it("only the move out of the unsuccessful close is looked at", async () => {
    await expect(reopen({ order: "canceled", status: "confirmed" })()).resolves.toBeUndefined()
    await expect(reopen({ order: "canceled" })("confirmed")).resolves.toBeUndefined()
    await expect(reopen({ order: "canceled", status: null })()).resolves.toBeUndefined()
  })
})

describe("reopenRefusalOf", () => {
  const ops = (over: Partial<ReopenOperations> = {}): ReopenOperations => ({
    currentStatus: async () => "closed_unsuccessfully",
    orderStatus: async () => "pending",
    givenBackMarker: async () => false,
    ...over,
  })

  it("is the sentence of the refusal for a canceled order or a marked one, and null when the reopening is allowed", async () => {
    expect(await reopenRefusalOf("order_1", ops({ orderStatus: async () => "canceled" }))).toMatch(/le lett mondva/)
    expect(await reopenRefusalOf("order_1", ops({ givenBackMarker: async () => true }))).toMatch(/visszajárt/)
    expect(await reopenRefusalOf("order_1", ops())).toBeNull()
  })

  it("lets any other error through: a failed read is not 'allowed'", async () => {
    await expect(
      reopenRefusalOf("order_1", ops({ orderStatus: async () => Promise.reject(new Error("db down")) }))
    ).rejects.toThrow("db down")
  })
})
