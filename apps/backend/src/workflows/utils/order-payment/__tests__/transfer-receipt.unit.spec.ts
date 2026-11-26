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
  captured: 0,
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
    // as Medusa does: the provider decides from the session's stored data; authorized or captured, a payment is made
    authorizeSession: async (id) => {
      calls.push(`authorize ${id}`)
      const stored = updates.find((u) => u.id === id)?.data ?? {}
      const { status } = await provider.authorizePayment({ data: stored } as never)
      calls.push(`provider ${status}`)
      return status === "captured" || status === "authorized" ? { payment_id: "pay_1" } : null
    },
    capture: async (id, amount) => {
      calls.push(`capture ${id} ${amount}`)
    },
    setBalanceReference: async (orderId, reference) => {
      calls.push(`reference ${orderId} ${reference}`)
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
      captured: 4800,
      outstanding: 0,
    })
    expect(calls).toEqual(["update payses_1", "authorize payses_1", "provider captured"])
    expect(updates[0]!.data).toEqual({
      acropora_transfer_stage: "awaiting_transfer",
      [BANK_TRANSFER_RECEIPT_KEY]: { reference: "OTP 0013", received_at: "2026-10-07" },
    })
  })

  it("a second call reports the capture and does nothing", async () => {
    const { operations, calls } = ops([transfer({ status: "authorized", payment_id: "pay_1", captured: 4800 })])
    await expect(recordTransferReceipt("order_55", input, operations)).resolves.toEqual({
      recorded: false,
      payment_id: "pay_1",
      captured: 4800,
      outstanding: 0,
    })
    expect(calls).toEqual([])
  })

  it("refuses a non-transfer order, a different amount, and a session not waiting", async () => {
    for (const [sessions, reason] of [
      [[transfer({ provider_id: "pp_acropora_cod" })], /nem előre utalással fizet/],
      [[transfer({ amount: 4799 })], /Az összeg eltér/],
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

  /*
    AN ADVANCE, THEN THE BALANCE (card d31a66a3, 2b). WHAT TURNS THIS RED: a transfer smaller than the order is refused (the advance
    proforma could never be paid); or it is captured as the whole order (the order reads paid on the advance); the balance is not
    exactly what is left, or is captured on a new payment; the same advance sent again (the OS's "Webshop fizetés lezárása") is
    captured twice; an advance that stopped before its capture is never captured.
  */
  it("an advance: the receipt is partial, the provider authorizes, and only the advance is captured", async () => {
    const { operations, calls, updates } = ops([transfer()])
    await expect(
      recordTransferReceipt(
        "order_55",
        { reference: "ELO-1", received_at: "2026-11-26", amount: 1920, advance: true },
        operations
      )
    ).resolves.toEqual({ recorded: true, payment_id: "pay_1", captured: 1920, outstanding: 2880 })
    expect(calls).toEqual(["update payses_1", "authorize payses_1", "provider authorized", "capture pay_1 1920"])
    expect(updates[0]!.data[BANK_TRANSFER_RECEIPT_KEY]).toEqual({
      reference: "ELO-1",
      received_at: "2026-11-26",
      partial: true,
      amount: 1920,
    })
  })

  // barracuda on #908: a full proforma underpaid (a typo, a bank fee) must not turn into an advance
  it("a smaller transfer without the advance mark is refused, as before, and nothing is written", async () => {
    const { operations, calls } = ops([transfer()])
    await expect(
      recordTransferReceipt("order_55", { reference: "OTP 0013", received_at: "2026-10-07", amount: 4300 }, operations)
    ).rejects.toMatchObject({ type: "conflict", message: expect.stringMatching(/Az összeg eltér/) })
    expect(calls).toEqual([])
  })

  const afterAdvance = (captured: number) =>
    transfer({
      status: "authorized",
      payment_id: "pay_1",
      captured,
      data: { [BANK_TRANSFER_RECEIPT_KEY]: { reference: "ELO-1", received_at: "2026-11-26", partial: true, amount: 1920 } },
    })

  it("the balance: exactly what is left, captured on the same payment; any other amount is refused", async () => {
    const { operations, calls } = ops([afterAdvance(1920)])
    await expect(
      recordTransferReceipt("order_55", { reference: "VEG-1", received_at: "2026-12-10", amount: 2880 }, operations)
    ).resolves.toEqual({ recorded: true, payment_id: "pay_1", captured: 4800, outstanding: 0 })
    expect(calls).toEqual(["capture pay_1 2880"])

    const wrong = ops([afterAdvance(1920)])
    await expect(
      recordTransferReceipt("order_55", { reference: "VEG-1", received_at: "2026-12-10", amount: 2000 }, wrong.operations)
    ).rejects.toMatchObject({ type: "conflict", message: expect.stringMatching(/a hátralék 2880/) })
    expect(wrong.calls).toEqual([])
  })

  it("the same advance again captures nothing; one that stopped before its capture is captured now", async () => {
    const again = ops([afterAdvance(1920)])
    await expect(
      recordTransferReceipt("order_55", { reference: " ELO-1 ", received_at: "2026-11-26", amount: 1920 }, again.operations)
    ).resolves.toEqual({ recorded: false, payment_id: "pay_1", captured: 1920, outstanding: 2880 })
    expect(again.calls).toEqual([])

    const stopped = ops([afterAdvance(0)])
    await expect(
      recordTransferReceipt("order_55", { reference: "ELO-1", received_at: "2026-11-26", amount: 1920 }, stopped.operations)
    ).resolves.toEqual({ recorded: true, payment_id: "pay_1", captured: 1920, outstanding: 2880 })
    expect(stopped.calls).toEqual(["capture pay_1 1920"])
  })

  /*
    THE NUMBER FOR THE BALANCE'S TRANSFER (acrobot 63071). WHAT TURNS THIS RED: the advance proforma's number is not kept on the
    order after the advance's capture, or is kept before it (a refused or stopped advance would show a number); a balance or a
    full receipt writes one; the same advance sent again cannot bring a number an older call did not.
  */
  it("an advance keeps the advance proforma's number on the order, after its capture", async () => {
    const { operations, calls } = ops([transfer()])
    await recordTransferReceipt(
      "order_55",
      { reference: "ELO-1", received_at: "2026-11-26", amount: 1920, advance: true, balance_reference: " D-CRPR-7 " },
      operations
    )
    expect(calls).toEqual([
      "update payses_1",
      "authorize payses_1",
      "provider authorized",
      "capture pay_1 1920",
      "reference order_55 D-CRPR-7",
    ])
  })

  it("no number is written without one, on a full receipt, or on the balance", async () => {
    const plain = ops([transfer()])
    await recordTransferReceipt(
      "order_55",
      { reference: "ELO-1", received_at: "2026-11-26", amount: 1920, advance: true },
      plain.operations
    )
    expect(plain.calls.some((c) => c.startsWith("reference"))).toBe(false)

    const full = ops([transfer()])
    await recordTransferReceipt("order_55", { ...input, balance_reference: "D-CRPR-7" }, full.operations)
    expect(full.calls.some((c) => c.startsWith("reference"))).toBe(false)

    const balance = ops([afterAdvance(1920)])
    await recordTransferReceipt(
      "order_55",
      { reference: "VEG-1", received_at: "2026-12-10", amount: 2880, balance_reference: "D-CRPR-7" },
      balance.operations
    )
    expect(balance.calls).toEqual(["capture pay_1 2880"])
  })

  it("the same advance sent again brings the number to an order recorded without it, and captures nothing", async () => {
    const again = ops([afterAdvance(1920)])
    await expect(
      recordTransferReceipt(
        "order_55",
        { reference: "ELO-1", received_at: "2026-11-26", amount: 1920, advance: true, balance_reference: "D-CRPR-7" },
        again.operations
      )
    ).resolves.toEqual({ recorded: false, payment_id: "pay_1", captured: 1920, outstanding: 2880 })
    expect(again.calls).toEqual(["reference order_55 D-CRPR-7"])
  })

  it("more than the order is refused, before anything is written", async () => {
    const { operations, calls } = ops([transfer()])
    await expect(
      recordTransferReceipt("order_55", { ...input, amount: 4801 }, operations)
    ).rejects.toMatchObject({ type: "conflict", message: expect.stringMatching(/Az összeg eltér/) })
    expect(calls).toEqual([])
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
    expect(AdminRecordTransferReceipt.safeParse({ ...input, advance: true }).success).toBe(true)
    for (const number of ["D-CRPR-7", "ACRD-2026/00012", "E-CRPRW-2026-6"])
      expect(AdminRecordTransferReceipt.safeParse({ ...input, advance: true, balance_reference: number }).success).toBe(true)
    for (const bad of [
      { ...input, reference: "  " },
      { ...input, received_at: "2026.10.07" },
      { ...input, amount: 0 },
      { ...input, captured: true },
      { ...input, advance: "yes" },
      // the balance reference is a document number, shown to the customer: nothing else passes
      { ...input, balance_reference: "" },
      { ...input, balance_reference: "D CRPR 7" },
      { ...input, balance_reference: "<b>7</b>" },
      { ...input, balance_reference: "-7" },
      { ...input, balance_reference: "A".repeat(41) },
    ])
      expect(AdminRecordTransferReceipt.safeParse(bad).success).toBe(false)
  })
})
