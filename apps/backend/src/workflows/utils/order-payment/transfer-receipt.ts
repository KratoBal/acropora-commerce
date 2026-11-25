import { MedusaError } from "@medusajs/framework/utils"

import { BANK_TRANSFER_PROVIDER_ID } from "../../../modules/acropora-transfer"
import { BANK_TRANSFER_RECEIPT_KEY, readBankTransferReceipt } from "../../../modules/acropora-transfer/service"
import type { OrderPaymentLock } from "./lock"

/**
 * THE PREPAYMENT ARRIVED, SO THE ORDER IS PAID IN MEDUSA (card bb3a6bd5;
 * acrobot 27145). The OS pairs the bank credit (or a person records it by
 * hand) and calls this; the order's bank-transfer session then becomes a
 * captured payment, so the order reads paid here as well.
 *
 * MEDUSA'S OWN PATH, NOTHING AROUND IT. Placing the order left the session in
 * `pending_authorization` with no payment record (payment-module 2.20.1,
 * `authorizePaymentSession`). The receipt goes into the session's data
 * (`updatePaymentSession`; the provider's `updatePayment` keeps it), and the
 * session is authorized again: with a receipt the provider answers CAPTURED,
 * and Medusa itself creates the payment and records the capture.
 *
 * WHAT IS REFUSED (409, in Hungarian, as the OS shows it):
 *   - an order not paid by bank transfer;
 *   - an amount that is not the session's: the OS checked the transfer
 *     against the proforma, and a different number means the two disagree;
 *   - a session that is no longer waiting (canceled, failed).
 * A second call after the capture is not an error: it reports what is there.
 *
 * AN ADVANCE, THEN THE BALANCE (card d31a66a3, 2b; Balázs 2026-11-25 10:19 UTC): for a high-value product the proforma asks for an
 * advance, so the first transfer can be LESS than the session, when the OS marks it as the advance proforma's (`advance`). Then the receipt is marked partial, the provider answers
 * AUTHORIZED (a payment for the whole order, nothing captured), and the advance's amount is captured on it: the order reads
 * partially paid. The balance is the next transfer: exactly what is still uncaptured, captured on the same payment, and the order
 * reads paid. The same advance sent again (its reference) is no second capture; one that stopped between the authorize and the
 * capture is finished. More than the session, or a balance that is not what is left, is refused.
 */
export type TransferSession = {
  id: string
  provider_id: string
  status: string
  amount: number
  currency_code: string
  data: Record<string, unknown> | null
  /** The payment the session became, if it did. */
  payment_id: string | null
  /** What was captured on that payment so far (0 without one). */
  captured: number
}

export type TransferReceiptOperations = {
  /** The order's payment sessions (every collection); `null`: no such order. */
  loadSessions(orderId: string): Promise<TransferSession[] | null>
  updateSession(input: {
    id: string
    data: Record<string, unknown>
    amount: number
    currency_code: string
  }): Promise<void>
  /** Medusa's authorize; the payment it made, or null if it stayed pending. */
  authorizeSession(id: string): Promise<{ payment_id: string } | null>
  /** The payment module's capture of this amount (an advance, or the balance after it). */
  capture(paymentId: string, amount: number): Promise<void>
}

export type TransferReceiptInput = {
  reference: string
  /** YYYY-MM-DD, the day the credit was booked. */
  received_at: string
  /** What the OS paired, in the order's currency. */
  amount: number
  /**
   * The OS issued an ADVANCE proforma, and this is its transfer (2b): only then is an amount below the order an advance. Without
   * it a smaller amount is refused as before: a full proforma underpaid (a typo, a bank fee) must not read as an advance.
   */
  advance?: boolean
}

export type TransferReceiptResult = {
  /** False: an earlier call captured it already; nothing was done now. */
  recorded: boolean
  payment_id: string
  /** Captured on the payment after this call. */
  captured: number
  /** What is still to be paid (0: paid). */
  outstanding: number
}

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.CONFLICT, message)
}

const cents = (value: number) => Math.round(value * 100)

/**
 * THE RECEIPT UNDER THE ORDER'S PAYMENT LOCK (card d31a66a3, 2b; barracuda on #908): an advance's capture and the balance's change
 * the order's payment, so they run one at a time with each other and with the switch, the capture and the hold's release
 * (`lock.ts`). Two balance calls side by side would both read the whole remainder; under the lock the second reads it captured.
 */
export const recordTransferReceiptUnderLock = (
  orderId: string,
  input: TransferReceiptInput,
  ops: TransferReceiptOperations,
  lock: OrderPaymentLock
): Promise<TransferReceiptResult> => lock(orderId, () => recordTransferReceipt(orderId, input, ops))

export const recordTransferReceipt = async (
  orderId: string,
  input: TransferReceiptInput,
  ops: TransferReceiptOperations
): Promise<TransferReceiptResult> => {
  const sessions = await ops.loadSessions(orderId)
  if (!sessions) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const transfer = sessions.filter((s) => s.provider_id === BANK_TRANSFER_PROVIDER_ID)
  if (!transfer.length) refuse("Ez a rendelés nem előre utalással fizet.")

  const paying = transfer.find((s) => s.payment_id && (s.status === "authorized" || s.status === "captured"))
  if (paying) return balanceOrRepeat(paying, input, ops)

  const waiting = transfer.filter((s) => s.status === "pending_authorization")
  if (waiting.length !== 1) refuse("A rendelés előre utalásos fizetése nem vár befizetésre.")
  const session = waiting[0]!
  // less than the order is an advance only when the OS says it is one (barracuda on #908): any other difference is refused
  const partial = input.advance === true && cents(input.amount) < cents(session.amount)
  if (cents(input.amount) !== cents(session.amount) && !partial)
    refuse(
      `Az összeg eltér: a rendelés ${session.amount} ${session.currency_code.toUpperCase()}, a beérkezés ${input.amount}.`
    )

  await ops.updateSession({
    id: session.id,
    data: {
      ...(session.data ?? {}),
      [BANK_TRANSFER_RECEIPT_KEY]: {
        reference: input.reference.trim(),
        received_at: input.received_at,
        ...(partial ? { partial: true, amount: input.amount } : {}),
      },
    },
    amount: session.amount,
    currency_code: session.currency_code,
  })
  const payment = await ops.authorizeSession(session.id)
  if (!payment) refuse("A befizetés rögzítése után a fizetés nem lett teljesítve; nézd meg a rendelést.")
  if (!partial) return { recorded: true, payment_id: payment!.payment_id, captured: session.amount, outstanding: 0 }
  await ops.capture(payment!.payment_id, input.amount)
  return {
    recorded: true,
    payment_id: payment!.payment_id,
    captured: input.amount,
    outstanding: (cents(session.amount) - cents(input.amount)) / 100,
  }
}

/** A session that became a payment: paid already, the same advance again (finished if it stopped), or the balance. */
const balanceOrRepeat = async (
  session: TransferSession,
  input: TransferReceiptInput,
  ops: TransferReceiptOperations
): Promise<TransferReceiptResult> => {
  const paymentId = session.payment_id!
  const outstanding = (cents(session.amount) - cents(session.captured)) / 100
  const paid = { recorded: false, payment_id: paymentId, captured: session.captured, outstanding: Math.max(outstanding, 0) }
  if (outstanding <= 0) return paid
  const advance = readBankTransferReceipt(session.data)
  if (advance?.partial && advance.reference === input.reference.trim()) {
    if (session.captured > 0) return paid
    // a run that stopped between the authorize and the capture: the advance's capture now
    await ops.capture(paymentId, advance.amount!)
    return {
      recorded: true,
      payment_id: paymentId,
      captured: advance.amount!,
      outstanding: (cents(session.amount) - cents(advance.amount!)) / 100,
    }
  }
  if (cents(input.amount) !== cents(outstanding))
    refuse(
      `Az összeg eltér: a hátralék ${outstanding} ${session.currency_code.toUpperCase()}, a beérkezés ${input.amount}.`
    )
  await ops.capture(paymentId, outstanding)
  return { recorded: true, payment_id: paymentId, captured: session.amount, outstanding: 0 }
}
