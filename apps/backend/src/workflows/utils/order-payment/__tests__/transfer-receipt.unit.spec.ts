import middlewares from "../../../../api/middlewares"
import { AdminRecordTransferReceipt } from "../../../../api/admin/order-payment/validators"
import AcroporaBankTransferService, {
  BANK_TRANSFER_RECEIPT_KEY,
} from "../../../../modules/acropora-transfer/service"
import {
  recordTransferReceipt,
  type TransferReceiptOperations,
  type TransferSession,
} from "../transfer-receipt"

/*
  THE PREPAYMENT ARRIVED (card bb3a6bd5). WHAT TURNS THIS RED:
  - a non-transfer order, a different amount, or a session not waiting is
    captured anyway;
  - the receipt does not reach the session's data, so the provider would keep
    answering "pending" and the order would never read paid;
  - a second call captures again instead of reporting what is there;
  - the session is authorized before the receipt is in it.
*/
const transfer = (over: Partial<TransferSession> = {}): TransferSession => ({
  id: "payses_1",
  provider_id: "pp_acropora_transfer",
  status: "pending_authorization",
  amount: 4800,
  currency_code: "huf",
  data: { acropora_transfer_stage: "awaiting_transfer" },
  payment_id: null,
  ...over,
})

const input = { reference: " OTP 0013 ", received_at: "2026-10-07", amount: 4800 }

function ops(sessions: TransferSession[] | null) {
  const calls: string[] = []
  const updates: { id: string; data: Record<string, unknown> }[] = []
  const provider = new AcroporaBankTransferService({}, {})
  const operations: TransferReceiptOperations = {
    loadSessions: async () => sessions,
    updateSession: async (update) => {
      calls.push(`update ${update.id}`)
      updates.push(update)
    },
    // as Medusa does: the provider decides from the session's stored data
    authorizeSession: async (id) => {
      calls.push(`authorize ${id}`)
      const stored = updates.find((u) => u.id === id)?.data ?? {}
      const { status } = await provider.authorizePayment({ data: stored } as never)
      return status === "captured" ? { payment_id: "pay_1" } : null
    },
  }
  return { operations, calls, updates }
}

describe("recording a received bank transfer in Medusa", () => {
  it("puts the receipt into the session, then authorizes it, and the provider captures", async () => {
    const { operations, calls, updates } = ops([transfer()])
    await expect(recordTransferReceipt("order_55", input, operations)).resolves.toEqual({
      recorded: true,
      payment_id: "pay_1",
    })
    expect(calls).toEqual(["update payses_1", "authorize payses_1"])
    expect(updates[0]!.data).toEqual({
      acropora_transfer_stage: "awaiting_transfer",
      [BANK_TRANSFER_RECEIPT_KEY]: { reference: "OTP 0013", received_at: "2026-10-07" },
    })
  })

  it("a second call reports the capture and does nothing", async () => {
    const { operations, calls } = ops([transfer({ status: "authorized", payment_id: "pay_1" })])
    await expect(recordTransferReceipt("order_55", input, operations)).resolves.toEqual({
      recorded: false,
      payment_id: "pay_1",
    })
    expect(calls).toEqual([])
  })

  it("refuses a non-transfer order, a different amount, and a session not waiting", async () => {
    for (const [sessions, reason] of [
      [[transfer({ provider_id: "pp_acropora_cod" })], /nem előre utalással fizet/],
      [[transfer({ amount: 4801 })], /Az összeg eltér/],
      [[transfer({ status: "canceled" })], /nem vár befizetésre/],
    ] as const) {
      const { operations, calls } = ops([...sessions])
      await expect(recordTransferReceipt("order_55", input, operations)).rejects.toMatchObject({
        type: "conflict",
        message: expect.stringMatching(reason),
      })
      expect(calls).toEqual([])
    }
  })

  it("an unknown order is not found", async () => {
    const { operations } = ops(null)
    await expect(recordTransferReceipt("order_x", input, operations)).rejects.toMatchObject({
      type: "not_found",
    })
  })
})

describe("the route's body", () => {
  it("is validated on the route: a reference, a day, a positive amount, nothing else", () => {
    const matcher = "/admin/order-payment/:order_id/transfer-receipt"
    expect((middlewares.routes ?? []).find((r) => r.matcher === matcher)?.middlewares).toHaveLength(1)
    expect(AdminRecordTransferReceipt.safeParse(input).success).toBe(true)
    for (const bad of [
      { ...input, reference: "  " },
      { ...input, received_at: "2026.10.07" },
      { ...input, amount: 0 },
      { ...input, captured: true },
    ])
      expect(AdminRecordTransferReceipt.safeParse(bad).success).toBe(false)
  })
})
