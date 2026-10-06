import { randomUUID } from "crypto"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"

/**
 * The prepayment-by-bank-transfer provider (card bb3a6bd5).
 *
 * Like cash on delivery (`acropora-payment`), there is no third party to talk
 * to: the buyer places the order, we send a proforma (díjbekérő) from the OS,
 * and money has moved only when the transfer reaches our account. The shape
 * is the same, and for the same reason: Medusa's `pending_authorization` is
 * the deferred case (its own source names bank transfers), and cart
 * completion creates the order with NO payment record for it.
 *
 * So the provider says "not yet" at checkout, and "received" only when a
 * receipt (the transfer's reference) has been recorded against the session.
 * The order is not paid by being placed.
 */

/** Where a recorded transfer lives on the payment session's data. */
export const BANK_TRANSFER_RECEIPT_KEY = "acropora_transfer_receipt" as const

/** Informational, for whoever reads the row later. Not a control field. */
export const BANK_TRANSFER_STAGE_KEY = "acropora_transfer_stage" as const

export const BANK_TRANSFER_STAGES = {
  AWAITING_TRANSFER: "awaiting_transfer",
  RECEIVED: "received",
  CANCELED: "canceled",
} as const

export type BankTransferReceipt = {
  /** The bank transaction or statement line the money came in on. */
  reference: string
  received_at?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * The recorded transfer, or null when none is recorded. A malformed one is an
 * error, not "nothing received": a receipt without a reference could not be
 * traced back to the bank line it claims.
 */
export const readBankTransferReceipt = (
  data: Record<string, unknown> | undefined | null
): BankTransferReceipt | null => {
  const raw = data?.[BANK_TRANSFER_RECEIPT_KEY]
  if (raw === undefined || raw === null) {
    return null
  }
  if (!isRecord(raw)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${BANK_TRANSFER_RECEIPT_KEY} must be an object describing the received transfer, received ${typeof raw}.`
    )
  }
  const reference = raw.reference
  if (typeof reference !== "string" || reference.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${BANK_TRANSFER_RECEIPT_KEY} needs a non-empty reference, so a captured amount can be traced back to the bank transfer it came from.`
    )
  }
  const receivedAt = raw.received_at
  if (receivedAt !== undefined && typeof receivedAt !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${BANK_TRANSFER_RECEIPT_KEY}.received_at must be an ISO 8601 string when present.`
    )
  }
  return {
    reference: reference.trim(),
    ...(receivedAt === undefined ? {} : { received_at: receivedAt }),
  }
}

class AcroporaBankTransferService extends AbstractPaymentProvider {
  static identifier = "acropora"

  constructor(
    container: Record<string, unknown>,
    options?: Record<string, unknown>
  ) {
    super(container, options)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    return {
      id: randomUUID(),
      data: {
        ...(input.data ?? {}),
        [BANK_TRANSFER_STAGE_KEY]: BANK_TRANSFER_STAGES.AWAITING_TRANSFER,
      },
    }
  }

  /** Placing the order is not paying for it: pending until a transfer is recorded. */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const receipt = readBankTransferReceipt(input.data)
    if (!receipt) {
      return {
        status: PaymentSessionStatus.PENDING_AUTHORIZATION,
        data: {
          ...(input.data ?? {}),
          [BANK_TRANSFER_STAGE_KEY]: BANK_TRANSFER_STAGES.AWAITING_TRANSFER,
        },
      }
    }
    return {
      status: PaymentSessionStatus.CAPTURED,
      data: {
        ...(input.data ?? {}),
        [BANK_TRANSFER_RECEIPT_KEY]: receipt,
        [BANK_TRANSFER_STAGE_KEY]: BANK_TRANSFER_STAGES.RECEIVED,
      },
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const receipt = readBankTransferReceipt(input.data)
    if (!receipt) {
      return { data: input.data ?? {} }
    }
    return {
      data: { ...(input.data ?? {}), [BANK_TRANSFER_RECEIPT_KEY]: receipt },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    if (!readBankTransferReceipt(input.data)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "A bank-transfer payment can only be captured once the transfer has been recorded against it. Nothing has been received for this order yet."
      )
    }
    return { data: input.data ?? {} }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    if (!readBankTransferReceipt(input.data)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Nothing was ever received for this bank-transfer order, so there is nothing to refund."
      )
    }
    return { data: input.data ?? {} }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        [BANK_TRANSFER_STAGE_KEY]: BANK_TRANSFER_STAGES.CANCELED,
      },
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  /** Reports what the session is: without a recorded transfer it is still waiting. */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return {
      status: readBankTransferReceipt(input.data)
        ? PaymentSessionStatus.AUTHORIZED
        : PaymentSessionStatus.PENDING_AUTHORIZATION,
      data: input.data ?? {},
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default AcroporaBankTransferService
