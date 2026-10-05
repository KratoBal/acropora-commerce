import {
  type EditHoldOperations,
  confirmKeepingHold,
  orderEditHoldDecision,
} from "../order-edit-hold"
import { capturePlainStripePayment } from "../plain-stripe-capture"
import {
  type CapturePaymentSide,
  type SharedCaptureOperations,
  captureSharedStripePayment,
} from "../shared-stripe-capture"

/**
 * AN ORDER EDIT KEEPS THE HOLD; THE CAPTURE WAITS FOR KISZÁLLÍTÁS (acrobot
 * 26310 decision 1, 26449 option B). What must fail: an uncaptured Stripe edit
 * that captures, or that does not keep the hold; a refused edit that touches
 * the collection; the collection left in AWAITING after a failed confirm; a
 * capture that takes money while an edit is being confirmed.
 */
const single = (payment: Record<string, unknown> = {}): CapturePaymentSide => ({
  order_id: "order_1",
  total: 27800,
  currency_code: "huf",
  payment: {
    id: "pay_1",
    amount: 27800,
    captured: 0,
    data: { id: "pi_1" },
    provider_id: "pp_stripe_stripe",
    collection_id: "pay_col_1",
    collection_status: "authorized",
    ...payment,
  },
})

const opsFor = (side: CapturePaymentSide | null, editTotal: number | null) => {
  const log: string[] = []
  const ops: EditHoldOperations = {
    requestedEditTotal: async () => editTotal,
    loadPair: async () => (side ? { shipped: side, pickup: null } : null),
    holdCollection: async (id) => {
      log.push(`hold ${id}`)
      return true
    },
    releaseCollection: async (id) => {
      log.push(`release ${id}`)
      return true
    },
  }
  return { ops, log }
}

describe("orderEditHoldDecision", () => {
  it("an uncaptured Stripe hold, the edit lowers the total: keep the hold, capture nothing", async () => {
    const { ops, log } = opsFor(single(), 24300)
    await expect(orderEditHoldDecision("order_1", ops)).resolves.toEqual({
      action: "keep_hold",
      collectionId: "pay_col_1",
      newTotal: 24300,
    })
    expect(log).toEqual([])
  })

  it("no requested edit, no payment, cash on delivery: passes to Medusa", async () => {
    await expect(orderEditHoldDecision("order_1", opsFor(single(), null).ops)).resolves.toEqual({
      action: "pass",
      reason: "no_requested_edit",
    })
    await expect(orderEditHoldDecision("order_1", opsFor(null, 100).ops)).resolves.toEqual({
      action: "pass",
      reason: "no_card_hold",
    })
    await expect(
      orderEditHoldDecision("order_1", opsFor(single({ provider_id: "pp_acropora_cod" }), 100).ops)
    ).resolves.toEqual({ action: "pass", reason: "no_card_hold" })
  })

  it("another card provider's uncaptured hold stops the edit", async () => {
    const result = await orderEditHoldDecision(
      "order_1",
      opsFor(single({ provider_id: "pp_other_card" }), 100).ops,
      ["pp_other_card"]
    )
    expect(result.action).toBe("refuse")
  })

  it("already captured: a lower total passes (a refund), a higher one is refused", async () => {
    const captured = single({ captured: 27800 })
    await expect(orderEditHoldDecision("order_1", opsFor(captured, 20000).ops)).resolves.toEqual({
      action: "pass",
      reason: "already_captured",
    })
    expect((await orderEditHoldDecision("order_1", opsFor(captured, 30000).ops)).action).toBe("refuse")
  })

  /**
   * AN ITEM ADDED OVER THE HOLD (Balázs 2026-10-05 18:01 UTC, plan section 5):
   * the edit goes through keeping the hold, the difference goes through a
   * link. A mixed cart's shared hold is still refused. What must fail: a plain
   * order's edit over the hold refused, or let through without keeping the
   * hold (Medusa would cancel it); a mixed cart's let through.
   */
  it("over the hold: a plain order keeps the hold, a mixed cart's share is refused", async () => {
    expect(await orderEditHoldDecision("order_1", opsFor(single(), 30000).ops)).toEqual({
      action: "keep_hold",
      collectionId: "pay_col_1",
      newTotal: 30000,
    })
    const shared = single({ data: { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 21950, own: 14000 } } })
    expect(await orderEditHoldDecision("order_1", opsFor(shared, 30000).ops)).toEqual({
      action: "refuse",
      message: expect.stringMatching(/Vegyes kosárnál a különbözetre/),
    })
  })

  it("nothing left to pay, or no collection: refused", async () => {
    for (const [side, total, words] of [
      [single(), 0, /törölni kell/],
      [single({ collection_id: undefined }), 100, /gyűjtője nem található/],
    ] as const) {
      const result = await orderEditHoldDecision("order_1", opsFor(side, total).ops)
      expect(result).toEqual({ action: "refuse", message: expect.stringMatching(words) })
    }
  })
})

describe("confirmKeepingHold", () => {
  it("AWAITING around Medusa's confirm, AUTHORIZED again after", async () => {
    const { ops, log } = opsFor(single(), 1)
    const result = await confirmKeepingHold("pay_col_1", ops, async () => {
      log.push("confirm")
      return "preview"
    })
    expect(result).toBe("preview")
    expect(log).toEqual(["hold pay_col_1", "confirm", "release pay_col_1"])
  })

  it("a failed confirm still gives the collection back", async () => {
    const { ops, log } = opsFor(single(), 1)
    await expect(
      confirmKeepingHold("pay_col_1", ops, async () => {
        throw new Error("lock timeout")
      })
    ).rejects.toThrow("lock timeout")
    expect(log).toEqual(["hold pay_col_1", "release pay_col_1"])
  })

  it("a collection that moved on (a capture got there first): Medusa's confirm does not run", async () => {
    const { ops, log } = opsFor(single(), 1)
    ops.holdCollection = async () => false
    const confirm = jest.fn()
    await expect(confirmKeepingHold("pay_col_1", ops, confirm)).rejects.toThrow(/közben megváltozott/)
    expect(confirm).not.toHaveBeenCalled()
    expect(log).toEqual([])
  })
})

describe("a capture during an edit's confirm", () => {
  const captureOps = (pair: { shipped: CapturePaymentSide; pickup: CapturePaymentSide | null }) => {
    const captures: string[] = []
    const ops: SharedCaptureOperations = {
      loadPair: async () => pair,
      setPaymentData: async () => undefined,
      capture: async (id, amount) => {
        captures.push(`${id} ${amount}`)
      },
    }
    return { ops, captures }
  }

  it("a plain card order: a retryable error, nothing captured", async () => {
    const { ops, captures } = captureOps({
      shipped: single({ collection_status: "awaiting" }),
      pickup: null,
    })
    await expect(capturePlainStripePayment("order_1", ops)).rejects.toThrow(/szerkesztése épp most fut/)
    expect(captures).toEqual([])
  })

  it("a mixed cart, either collection: a retryable error, nothing captured", async () => {
    const SHARE = { transactionId: "pi_joint", total: 21950, own: 4950 }
    const shipped = (status: string) =>
      single({
        id: "pay_ship",
        amount: 4950,
        data: { id: "pi_joint", stripe_share: SHARE },
        collection_status: status,
      })
    const pickup = (status: string): CapturePaymentSide => ({
      ...single({
        id: "pay_pick",
        amount: 17000,
        data: { id: "pi_joint", stripe_share: { ...SHARE, own: 17000, joined: true } },
        collection_status: status,
      }),
      order_id: "order_pick",
      total: 17000,
    })
    for (const [a, b] of [
      ["awaiting", "authorized"],
      ["authorized", "awaiting"],
    ]) {
      const { ops, captures } = captureOps({
        shipped: { ...shipped(a), total: 4950 },
        pickup: pickup(b),
      })
      await expect(captureSharedStripePayment("order_1", ops)).rejects.toThrow(/szerkesztése épp most fut/)
      expect(captures).toEqual([])
    }
  })

  it("after the edit (AUTHORIZED again) the plain capture takes the reduced total", async () => {
    const { ops, captures } = captureOps({
      shipped: { ...single(), total: 24300 },
      pickup: null,
    })
    await expect(capturePlainStripePayment("order_1", ops)).resolves.toEqual({
      captured: true,
      amount: 24300,
    })
    expect(captures).toEqual(["pay_1 24300"])
  })
})
