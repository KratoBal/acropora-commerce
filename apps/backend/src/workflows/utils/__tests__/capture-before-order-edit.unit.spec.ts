import { type EditCaptureOperations, captureBeforeOrderEdit } from "../capture-before-order-edit"
import type { CapturePaymentSide } from "../shared-stripe-capture"

/**
 * THE CARD HOLD IS CAPTURED BEFORE AN ORDER EDIT IS CONFIRMED (acrobot 25584;
 * stage 2026-10-01: #15 lost its hold to Medusa's confirm, #16 captured first
 * and kept it).
 *
 * What must fail: an edit confirmed with the hold uncaptured; a capture of the
 * order's OLD total, not the edited one; a mixed cart captured for the wrong
 * order's new total, or from the pickup order instead of its shipped parent;
 * the collection left asking for the whole hold; a non-Stripe payment touched;
 * a captured payment captured again; an edit above the hold or above what was
 * captured, or to nothing, let through.
 */
const SHARE = { transactionId: "pi_joint", total: 21950, own: 4950 }

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
    ...payment,
  },
})

const shipped = (payment: Record<string, unknown> = {}): CapturePaymentSide => ({
  order_id: "order_ship",
  total: 4950,
  currency_code: "huf",
  payment: {
    id: "pay_ship",
    amount: 4950,
    captured: 0,
    data: { id: "pi_joint", stripe_share: SHARE },
    provider_id: "pp_stripe_stripe",
    collection_id: "pay_col_ship",
    ...payment,
  },
})

const pickup = (payment: Record<string, unknown> = {}): CapturePaymentSide => ({
  order_id: "order_pick",
  total: 17000,
  currency_code: "huf",
  payment: {
    id: "pay_pick",
    amount: 17000,
    captured: 0,
    data: { id: "pi_joint", stripe_share: { ...SHARE, own: 17000, joined: true } },
    provider_id: "pp_stripe_stripe",
    collection_id: "pay_col_pick",
    ...payment,
  },
})

const opsFor = (
  sides: CapturePaymentSide[],
  editTotal: number | null,
  pairs: Record<string, [string, string | null]> = {}
) => {
  const log: string[] = []
  const byId = (id: string | null) => sides.find((side) => side.order_id === id) ?? null
  const ops: EditCaptureOperations = {
    requestedEditTotal: async () => editTotal,
    parentOrderId: async (id) => (id === "order_pick" ? "order_ship" : null),
    loadPair: async (id) => {
      const [own, other] = pairs[id] ?? [id, null]
      const side = byId(own)
      return side ? { shipped: side, pickup: byId(other) } : null
    },
    setPaymentData: async (id, data) => {
      log.push(`data ${id} ${JSON.stringify(data.stripe_capture_parts)}`)
    },
    capture: async (id, amount) => {
      log.push(`capture ${id} ${amount}`)
    },
    setCollectionAmount: async (id, amount) => {
      log.push(`collection ${id} ${amount}`)
    },
  }
  return { ops, log }
}

const MIXED_PAIRS: Record<string, [string, string | null]> = {
  order_ship: ["order_ship", "order_pick"],
  order_pick: ["order_pick", null],
}

describe("captureBeforeOrderEdit", () => {
  it("captures the edited total before the confirm, and the collection asks for no more", async () => {
    const { ops, log } = opsFor([single()], 17300)
    expect(await captureBeforeOrderEdit("order_1", ops)).toEqual({ action: "captured", amount: 17300 })
    expect(log).toEqual(["collection pay_col_1 17300", "capture pay_1 17300"])
  })

  it("mixed cart, the shipped order edited: one capture, the shipped part at its new total", async () => {
    const { ops, log } = opsFor([shipped(), pickup()], 4000, MIXED_PAIRS)
    expect(await captureBeforeOrderEdit("order_ship", ops)).toEqual({ action: "captured", amount: 4000 })
    expect(log).toEqual([
      "collection pay_col_ship 4000",
      'data pay_ship {"total":2100000,"parts":{"pay_ship":400000,"pay_pick":1700000}}',
      "capture pay_ship 4000",
      "capture pay_pick 17000",
    ])
  })

  it("mixed cart, the pickup order edited: captured from its shipped parent, the pickup part at its new total", async () => {
    const { ops, log } = opsFor([shipped(), pickup()], 8500, MIXED_PAIRS)
    expect(await captureBeforeOrderEdit("order_pick", ops)).toEqual({ action: "captured", amount: 8500 })
    expect(log).toEqual([
      "collection pay_col_pick 8500",
      'data pay_ship {"total":1345000,"parts":{"pay_ship":495000,"pay_pick":850000}}',
      "capture pay_ship 4950",
      "capture pay_pick 8500",
    ])
  })

  /*
    THE COLLECTION BEFORE THE CAPTURE (stage #17: set after, its status stayed
    AUTHORIZED). MI PIROSÍT: if the amount went on after the capture; if a failed
    capture left the collection asking for the smaller amount.
  */
  it("a failed capture: the collection asks for the hold again, the error goes on", async () => {
    const { ops, log } = opsFor([single()], 17300)
    ops.capture = async () => {
      log.push("capture fails")
      throw new Error("hold expired")
    }
    await expect(captureBeforeOrderEdit("order_1", ops)).rejects.toThrow("hold expired")
    expect(log).toEqual(["collection pay_col_1 17300", "capture fails", "collection pay_col_1 27800"])
  })

  it("no requested edit: nothing is touched", async () => {
    const { ops, log } = opsFor([single()], null)
    expect(await captureBeforeOrderEdit("order_1", ops)).toEqual({ action: "pass", reason: "no_requested_edit" })
    expect(log).toEqual([])
  })

  it("not a Stripe payment (SimplePay, cash on delivery): nothing is touched", async () => {
    for (const provider_id of ["pp_simplepay_simplepay", "pp_acropora_cod", "pp_system_default"]) {
      const { ops, log } = opsFor([single({ provider_id })], 17300)
      expect(await captureBeforeOrderEdit("order_1", ops)).toEqual({ action: "pass", reason: "no_card_hold" })
      expect(log).toEqual([])
    }
  })

  it("already captured, the edit lowers the total: passes, the difference is a refund", async () => {
    const { ops, log } = opsFor([single({ captured: 17300 })], 15000)
    expect(await captureBeforeOrderEdit("order_1", ops)).toEqual({ action: "pass", reason: "already_captured" })
    expect(log).toEqual([])
  })

  it("already captured, the edit asks for more than was captured: refused", async () => {
    const { ops, log } = opsFor([single({ captured: 17300 })], 20000)
    const result = await captureBeforeOrderEdit("order_1", ops)
    expect(result.action).toBe("refuse")
    expect(log).toEqual([])
  })

  it("uncaptured, the edit asks for more than the hold: refused, nothing captured", async () => {
    const { ops, log } = opsFor([single()], 30000)
    const result = await captureBeforeOrderEdit("order_1", ops)
    expect(result).toEqual({ action: "refuse", message: expect.stringContaining("30000 Ft") })
    expect(log).toEqual([])
  })

  it("the edit leaves nothing to pay: refused, that is a cancel", async () => {
    const { ops, log } = opsFor([single()], 0)
    expect((await captureBeforeOrderEdit("order_1", ops)).action).toBe("refuse")
    expect(log).toEqual([])
  })
})
