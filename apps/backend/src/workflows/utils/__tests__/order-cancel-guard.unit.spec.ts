import { type CancelOrderFacts, type CancelPayment, prepareOrderCancel } from "../order-cancel-guard"

/**
 * THE ORDER CANCEL GUARD (acrobot 25694, 25696; stage #25 canceled with its
 * money kept, Medusa's own refund failed silently). What must fail: a cancel
 * that runs although its refund failed; a captured payment not refunded before
 * the cancel; a refund before a cancel Medusa would refuse anyway; a mixed
 * cart's shipped order canceled while the pickup part rides on its hold (4a);
 * an ordinary or a pickup order held back.
 */
const payment = (over: Partial<CancelPayment> = {}): CancelPayment => ({
  id: "pay_1",
  outstanding: 0,
  captured: 0,
  canceled: false,
  data: { id: "pi_1" },
  ...over,
})
const order = (over: Partial<CancelOrderFacts> = {}): CancelOrderFacts => ({
  id: "order_1",
  status: "pending",
  openFulfillments: 0,
  payments: [payment()],
  pickupPaymentLive: false,
  ...over,
})
const opsFor = (facts: CancelOrderFacts | null, fail?: string) => {
  const refunds: string[] = []
  return {
    refunds,
    ops: {
      load: async () => facts,
      refund: async (id: string, amount: number) => {
        if (fail) throw new Error(fail)
        refunds.push(`${id} ${amount}`)
      },
    },
  }
}
const JOINT = { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 25800, own: 17300 } }
const JOINED = { id: "pi_joint", stripe_share: { transactionId: "pi_joint", total: 25800, own: 8500, joined: true } }

describe("prepareOrderCancel", () => {
  it("refunds the captured money first, then lets the cancel run", async () => {
    const { ops, refunds } = opsFor(order({ payments: [payment({ captured: 22600, outstanding: 22600 })] }))
    expect(await prepareOrderCancel("order_1", ops)).toEqual({
      action: "pass",
      refunded: [{ paymentId: "pay_1", amount: 22600 }],
    })
    expect(refunds).toEqual(["pay_1 22600"])
  })

  it("a failed refund stops the cancel, and says why", async () => {
    const { ops } = opsFor(order({ payments: [payment({ captured: 22600, outstanding: 22600 })] }), "Stripe refused")
    const result = await prepareOrderCancel("order_1", ops)
    expect(result).toEqual({ action: "refuse", message: expect.stringContaining("Stripe refused") })
  })

  it("nothing is refunded for a cancel Medusa refuses anyway, or with nothing captured", async () => {
    for (const facts of [
      order({ status: "canceled", payments: [payment({ captured: 100, outstanding: 100 })] }),
      order({ status: "completed", payments: [payment({ captured: 100, outstanding: 100 })] }),
      order({ openFulfillments: 1, payments: [payment({ captured: 100, outstanding: 100 })] }),
      order(),
    ]) {
      const { ops, refunds } = opsFor(facts)
      expect((await prepareOrderCancel("order_1", ops)).action).toBe("pass")
      expect(refunds).toEqual([])
    }
  })

  it("a mixed cart's shipped order waits while the pickup part rides on its hold (4a)", async () => {
    const { ops, refunds } = opsFor(order({ payments: [payment({ data: JOINT })], pickupPaymentLive: true }))
    expect(await prepareOrderCancel("order_1", ops)).toEqual({
      action: "refuse",
      message: expect.stringContaining("Előbb a bolti rendelést töröld"),
    })
    expect(refunds).toEqual([])
  })

  it("once the pickup order is canceled, or once the shared payment is captured, the shipped order goes", async () => {
    const free = opsFor(order({ payments: [payment({ data: JOINT })], pickupPaymentLive: false }))
    expect((await prepareOrderCancel("order_1", free.ops)).action).toBe("pass")
    const captured = opsFor(
      order({ payments: [payment({ data: JOINT, captured: 17300, outstanding: 17300 })], pickupPaymentLive: true })
    )
    expect((await prepareOrderCancel("order_1", captured.ops)).action).toBe("pass")
    expect(captured.refunds).toEqual(["pay_1 17300"])
  })

  it("the pickup order itself is not held back", async () => {
    const { ops } = opsFor(order({ payments: [payment({ data: JOINED })], pickupPaymentLive: false }))
    expect((await prepareOrderCancel("order_1", ops)).action).toBe("pass")
  })
})
