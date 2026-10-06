import { MedusaError } from "@medusajs/framework/utils"

import { BANK_TRANSFER_PROVIDER_ID } from "../../../modules/acropora-transfer"
import { BANK_TRANSFER_RECEIPT_KEY } from "../../../modules/acropora-transfer/service"

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
}

export type TransferReceiptInput = {
  reference: string
  /** YYYY-MM-DD, the day the credit was booked. */
  received_at: string
  /** What the OS paired, in the order's currency. */
  amount: number
}

export type TransferReceiptResult = {
  /** False: an earlier call captured it already; nothing was done now. */
  recorded: boolean
  payment_id: string
}

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.CONFLICT, message)
}

export const recordTransferReceipt = async (
  orderId: string,
  input: TransferReceiptInput,
  ops: TransferReceiptOperations
): Promise<TransferReceiptResult> => {
  const sessions = await ops.loadSessions(orderId)
  if (!sessions) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const transfer = sessions.filter((s) => s.provider_id === BANK_TRANSFER_PROVIDER_ID)
  if (!transfer.length) refuse("Ez a rendelés nem előre utalással fizet.")

  const done = transfer.find((s) => s.payment_id && (s.status === "authorized" || s.status === "captured"))
  if (done) return { recorded: false, payment_id: done.payment_id! }

  const waiting = transfer.filter((s) => s.status === "pending_authorization")
  if (waiting.length !== 1) refuse("A rendelés előre utalásos fizetése nem vár befizetésre.")
  const session = waiting[0]!
  if (Math.round(session.amount * 100) !== Math.round(input.amount * 100))
    refuse(
      `Az összeg eltér: a rendelés ${session.amount} ${session.currency_code.toUpperCase()}, a beérkezés ${input.amount}.`
    )

  await ops.updateSession({
    id: session.id,
    data: {
      ...(session.data ?? {}),
      [BANK_TRANSFER_RECEIPT_KEY]: { reference: input.reference.trim(), received_at: input.received_at },
    },
    amount: session.amount,
    currency_code: session.currency_code,
  })
  const payment = await ops.authorizeSession(session.id)
  if (!payment) refuse("A befizetés rögzítése után a fizetés nem lett teljesítve; nézd meg a rendelést.")
  return { recorded: true, payment_id: payment!.payment_id }
}
