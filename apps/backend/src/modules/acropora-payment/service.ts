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
 * The cash-on-delivery payment provider.
 *
 * Cash on delivery has no third-party system to talk to. What this provider
 * models is not a connection, it is a PROMISE: the customer pays the courier,
 * the courier remits to us days later, and only then has money moved.
 *
 * Everything below follows from one business rule (D-2026-08-23-25, first
 * point): the order counts as paid when the money reaches us, not when the
 * order is created. Medusa has a status for exactly this shape of payment,
 * `pending_authorization`, described in its own source as the deferred case
 * (bank transfers, payment links, vouchers). Cart completion handles it
 * explicitly: the order is created and NO payment record is created with it.
 *
 * The provider therefore says "not yet" at checkout, and "received" only when
 * a remittance has been recorded against the session.
 */

/** Where a recorded remittance lives on the payment session's data. */
export const CASH_ON_DELIVERY_REMITTANCE_KEY = "acropora_cod_remittance" as const

/** Informational, for whoever reads the row later. Not a control field. */
export const CASH_ON_DELIVERY_STAGE_KEY = "acropora_cod_stage" as const

export const CASH_ON_DELIVERY_STAGES = {
  AWAITING_REMITTANCE: "awaiting_remittance",
  REMITTED: "remitted",
  CANCELED: "canceled",
} as const

/**
 * How a cash-on-delivery order can end, and what each ending means for money.
 *
 * This is the third business rule written down where the code can see it
 * (D-2026-08-23-25): a failed delivery is NOT a refund, because no money ever
 * moved. Keeping the three endings in one place is what stops the failed one
 * from being handled as a refund by whoever meets it next.
 */
export const CASH_ON_DELIVERY_OUTCOMES = {
  /** The courier collected and remitted. This is the only path to a capture. */
  REMITTED: "remitted",
  /**
   * The parcel was never handed over. The order is closed as unsuccessful:
   * not deleted, and NOT refunded, because nothing was ever collected.
   */
  FAILED_DELIVERY: "failed_delivery",
  /** The customer paid and later returned the goods. Only this one refunds. */
  RETURNED_AFTER_PAYMENT: "returned_after_payment",
} as const

export type CashOnDeliveryRemittance = {
  /** The courier's settlement reference. Free text, but required. */
  reference: string
  /** When the money reached us, as an ISO 8601 string. */
  received_at?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Reads a recorded remittance, and refuses a malformed one.
 *
 * Absent is a normal state: it means the money has not arrived. Present but
 * unreadable is an error, because the alternative is treating an unparseable
 * record as "no money" and leaving an order unpaid that was in fact paid.
 */
export const readCashOnDeliveryRemittance = (
  data: Record<string, unknown> | undefined | null
): CashOnDeliveryRemittance | null => {
  const raw = data?.[CASH_ON_DELIVERY_REMITTANCE_KEY]

  if (raw === undefined || raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_REMITTANCE_KEY} must be an object describing the received payment, received ${typeof raw}.`
    )
  }

  const reference = raw.reference

  if (typeof reference !== "string" || reference.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_REMITTANCE_KEY} needs a non-empty reference, so a captured amount can be traced back to the courier settlement it came from.`
    )
  }

  const receivedAt = raw.received_at

  if (receivedAt !== undefined && typeof receivedAt !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${CASH_ON_DELIVERY_REMITTANCE_KEY}.received_at must be an ISO 8601 string when present.`
    )
  }

  return {
    reference: reference.trim(),
    ...(receivedAt === undefined ? {} : { received_at: receivedAt }),
  }
}

class AcroporaCashOnDeliveryService extends AbstractPaymentProvider {
  static identifier = "acropora"

  /**
   * Declared only to widen the inherited protected constructor: the module
   * loader instantiates providers from outside the class.
   */
  constructor(
    container: Record<string, unknown>,
    options?: Record<string, unknown>
  ) {
    super(container, options)
  }

  /**
   * Nothing is contacted here. The session exists so the cart has a payment
   * method; the id is ours because there is no remote id to borrow.
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    return {
      id: randomUUID(),
      data: {
        ...(input.data ?? {}),
        [CASH_ON_DELIVERY_STAGE_KEY]:
          CASH_ON_DELIVERY_STAGES.AWAITING_REMITTANCE,
      },
    }
  }

  /**
   * The single decision of this provider.
   *
   * Without a recorded remittance the answer is "not yet", and Medusa creates
   * the order without a payment record. With one, the payment is reported as
   * received, which is what produces the capture and, through it, the order
   * transaction that the courier settlement is later reconciled against.
   *
   * This method runs TWICE on the same session: once at checkout, once when
   * the money is acknowledged. Both calls arrive with the same shape and no
   * caller identity, so the only thing that can tell them apart is the session
   * data. That is deliberate, and it is what makes acknowledgement a separate
   * act (D-2026-08-23-25, fifth point) rather than a side effect of any admin
   * pressing a button: a caller that has not recorded a remittance cannot move
   * this payment forward, whatever their rights are.
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const remittance = readCashOnDeliveryRemittance(input.data)

    if (!remittance) {
      return {
        status: PaymentSessionStatus.PENDING_AUTHORIZATION,
        data: {
          ...(input.data ?? {}),
          [CASH_ON_DELIVERY_STAGE_KEY]:
            CASH_ON_DELIVERY_STAGES.AWAITING_REMITTANCE,
        },
      }
    }

    return {
      status: PaymentSessionStatus.CAPTURED,
      data: {
        ...(input.data ?? {}),
        [CASH_ON_DELIVERY_REMITTANCE_KEY]: remittance,
        [CASH_ON_DELIVERY_STAGE_KEY]: CASH_ON_DELIVERY_STAGES.REMITTED,
      },
    }
  }

  /**
   * Carries a remittance record onto the session.
   *
   * Medusa replaces the session data with whatever this returns, so this is
   * also the validation point: a malformed record is refused here rather than
   * silently stored and read back as "no money arrived".
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const remittance = readCashOnDeliveryRemittance(input.data)

    if (!remittance) {
      return { data: input.data ?? {} }
    }

    return {
      data: {
        ...(input.data ?? {}),
        [CASH_ON_DELIVERY_REMITTANCE_KEY]: remittance,
      },
    }
  }

  /**
   * The money is already in our hands by the time this runs: the capture is
   * the bookkeeping of a remittance, not a request to anyone. It still refuses
   * without one, because a capture with no traceable settlement is an amount
   * nobody can later match to a courier transfer.
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const remittance = readCashOnDeliveryRemittance(input.data)

    if (!remittance) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "A cash-on-delivery payment can only be captured once a remittance has been recorded against it. Nothing has been received for this order yet."
      )
    }

    return { data: input.data ?? {} }
  }

  /**
   * Refunds only exist on money that arrived.
   *
   * A parcel that was never handed over is NOT a refund
   * (`CASH_ON_DELIVERY_OUTCOMES.FAILED_DELIVERY`): no money moved, so there is
   * nothing to send back, and the order is closed as unsuccessful instead.
   * Treating it as a refund would put a return of funds into the books that
   * never had a matching receipt.
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const remittance = readCashOnDeliveryRemittance(input.data)

    if (!remittance) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Nothing was ever collected for this cash-on-delivery order, so there is nothing to refund. An undelivered parcel is closed as ${CASH_ON_DELIVERY_OUTCOMES.FAILED_DELIVERY}, not refunded.`
      )
    }

    return { data: input.data ?? {} }
  }

  /**
   * Reports what the session is, rather than what we would like it to be. A
   * session with no remittance is still waiting, however old it is.
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const remittance = readCashOnDeliveryRemittance(input.data)

    return {
      status: remittance
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

  /**
   * Cancelling costs nothing here, and it is the normal end of an order that
   * was never collected. There is no external authorization to release.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        [CASH_ON_DELIVERY_STAGE_KEY]: CASH_ON_DELIVERY_STAGES.CANCELED,
      },
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  /** Cash on delivery has no remote system, so nothing can call back. */
  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default AcroporaCashOnDeliveryService
