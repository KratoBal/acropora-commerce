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

import { SimplePayClient, SimplePayConfig } from "./client"

/** Where the SimplePay facts live on the payment session's data. */
export const SIMPLEPAY_DATA_KEY = "simplepay"

/**
 * ONE TRANSACTION FOR BOTH ORDERS OF A SPLIT CART (P4-3c). Set only by our own
 * server code, never by the client (the store route refuses these keys, see
 * `refuseClientSimplePayKeys`):
 *
 * - `simplepay_joint` on the shipped cart's session: start ONE transaction for
 *   `total`, the two carts together (at least this session's own amount);
 * - `simplepay_joined` on the pickup cart's session: start nothing, carry the
 *   shipped session's transaction.
 */
export const SIMPLEPAY_JOINT_KEY = "simplepay_joint"
export const SIMPLEPAY_JOINED_KEY = "simplepay_joined"

export type SimplePayOptions = {
  merchant?: string
  secretKey?: string
  /** Anything but "false" is the sandbox: the live URL must be chosen on purpose. */
  sandbox?: boolean | string
  /** Our storefront page the customer returns to (section 3.12). */
  backUrl?: string
}

export type SimplePayInvoice = {
  name: string
  company?: string
  country: string
  city: string
  zip: string
  address: string
  address2?: string
  phone?: string
}

type SimplePayFacts = {
  transactionId: number
  orderRef: string
  paymentUrl?: string
  timeout?: string
  /** The transaction's total, as SimplePay confirmed it at the start. */
  total?: number
  /** This session's own amount; less than `total` when the transaction is shared (P4-3c). */
  own?: number
  /** Set on the pickup session that carries the shipped session's transaction. */
  joined?: boolean
  status?: string
}

/** The status a FINISHED transaction reads as when its total is not the one we started. */
export const SIMPLEPAY_TOTAL_MISMATCH = "TOTAL_MISMATCH"

/**
 * THE TRANSACTION STATUS AS MEDUSA READS IT (statuses, L493-505).
 *
 * The charge is one step (acrobot, 2026-09-29: no twoStep), so FINISHED is
 * money taken: CAPTURED. AUTHORIZED only happens on a two-step account. INIT
 * and INPAYMENT mean the customer has not paid yet; anything that ended
 * without payment is CANCELED, and an unknown status is an ERROR rather than
 * a guess.
 */
export const simplePayStatusToSession = (status: string | undefined) => {
  switch (status) {
    case "FINISHED":
      return PaymentSessionStatus.CAPTURED
    case "AUTHORIZED":
      return PaymentSessionStatus.AUTHORIZED
    case "INIT":
    case "INPAYMENT":
    case "INFRAUD":
      return PaymentSessionStatus.PENDING
    case "CANCELLED":
    case "TIMEOUT":
    case "NOTAUTHORIZED":
    case "REVERSED":
      return PaymentSessionStatus.CANCELED
    default:
      return PaymentSessionStatus.ERROR
  }
}

/** HUF is a whole number (L573-575); anything else would be a wrong charge. */
const hufTotal = (amount: unknown): number => {
  const total = Number(amount)
  if (!Number.isInteger(total) || total <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `A SimplePay HUF amount must be a positive whole number, got ${String(amount)}`
    )
  }
  return total
}

const factsOf = (data: Record<string, unknown> | undefined): SimplePayFacts => {
  const facts = data?.[SIMPLEPAY_DATA_KEY] as SimplePayFacts | undefined
  if (!facts?.transactionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This payment session has no SimplePay transaction"
    )
  }
  return facts
}

/**
 * SIMPLEPAY (API v2, redirect payment on SimplePay's own page). P4-3a: the
 * provider and its calls. The IPN answer (P4-3b), one transaction for the two
 * orders of a split cart (P4-3c) and the storefront (P4-4) come separately.
 *
 * The order is fulfilled when SimplePay says FINISHED, by IPN or query (L372,
 * L533, L726), never on the customer's return: `authorizePayment` asks.
 */
class SimplePayProviderService extends AbstractPaymentProvider<SimplePayOptions> {
  static identifier = "simplepay"

  private client_: SimplePayClient | null
  private readonly backUrl_: string | undefined

  constructor(container: Record<string, unknown>, options?: SimplePayOptions) {
    super(container, options)
    const config = SimplePayProviderService.configOf(options)
    this.client_ = config ? new SimplePayClient(config) : null
    this.backUrl_ = options?.backUrl?.trim() || undefined
  }

  static configOf(options?: SimplePayOptions): SimplePayConfig | null {
    const merchant = options?.merchant?.trim()
    const secretKey = options?.secretKey?.trim()
    if (!merchant || !secretKey) return null
    return { merchant, secretKey, sandbox: String(options?.sandbox ?? "true") !== "false" }
  }

  /** For tests: a client with a fake transport. */
  withClient(client: SimplePayClient) {
    this.client_ = client
    return this
  }

  private get client(): SimplePayClient {
    if (!this.client_) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "SimplePay is not configured (merchant and secret key)"
      )
    }
    return this.client_
  }

  /**
   * START (section 3.3). The amount and currency come from Medusa's payment
   * collection; the email and the billing address come with the session data
   * (they are the customer's own details, needed for 3DS, L758-773); the back
   * URL is ours, from the configuration, never from the request.
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const {
      [SIMPLEPAY_JOINT_KEY]: joint,
      [SIMPLEPAY_JOINED_KEY]: joined,
      ...data
    } = (input.data ?? {}) as Record<string, unknown>
    const own = hufTotal(input.amount)

    // THE PICKUP SESSION OF A SPLIT: the shipped session's transaction, no new start.
    // The two parts TOGETHER must be exactly the transaction's total: the
    // shipped session's own amount plus this one. If the pickup cart's total
    // moved after the start (its promotions are computed again after the
    // split), the orders would book more or less than was paid (nautilus's
    // review of #433, 2026-09-29), so the payment is started again instead.
    if (joined) {
      const facts = joined as SimplePayFacts
      const shippedOwn = Number(facts.own)
      if (
        !facts.transactionId ||
        !facts.orderRef ||
        !Number.isInteger(shippedOwn) ||
        shippedOwn + own !== hufTotal(facts.total)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "A joined SimplePay session needs the shared transaction, whose total is exactly the two carts together"
        )
      }
      return {
        id: String(facts.transactionId),
        data: {
          ...data,
          [SIMPLEPAY_DATA_KEY]: {
            transactionId: facts.transactionId,
            orderRef: facts.orderRef,
            paymentUrl: facts.paymentUrl,
            timeout: facts.timeout,
            total: facts.total,
            own,
            joined: true,
          } satisfies SimplePayFacts,
        },
      }
    }

    const email =
      (typeof data.customer_email === "string" && data.customer_email) ||
      input.context?.customer?.email
    const invoice = data.invoice as SimplePayInvoice | undefined

    if (!email || !invoice?.name || !invoice.city || !invoice.zip || !invoice.address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SimplePay needs the customer's email and billing address (name, city, postcode, address)"
      )
    }
    if (!this.backUrl_) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The SimplePay back URL is not configured")
    }

    // THE SHIPPED SESSION OF A SPLIT starts one transaction for both carts.
    const total = joint ? hufTotal((joint as { total?: unknown }).total) : own
    if (total < own) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A joint SimplePay total (${total}) cannot be less than this session's amount (${own})`
      )
    }
    const sessionId = typeof data.session_id === "string" ? data.session_id : "session"
    // Unique per start: a failed orderRef may be reused, a paid one may not (L667-668).
    const orderRef = `${sessionId}-${Date.now().toString(36)}`

    const answer = await this.client.call<{
      transactionId: number
      paymentUrl: string
      timeout: string
      total: number
    }>("start", {
      orderRef,
      currency: input.currency_code.toUpperCase(),
      customerEmail: email,
      language: "HU",
      methods: ["CARD"],
      total: String(total),
      timeout: new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "+00:00"),
      url: this.backUrl_,
      twoStep: false,
      invoice: { ...invoice, country: (invoice.country || "hu").toLowerCase() },
    })

    return {
      id: String(answer.transactionId),
      data: {
        ...data,
        [SIMPLEPAY_DATA_KEY]: {
          transactionId: answer.transactionId,
          orderRef,
          paymentUrl: answer.paymentUrl,
          timeout: answer.timeout,
          total: answer.total,
          own,
        } satisfies SimplePayFacts,
      },
    }
  }

  /**
   * QUERY (section 3.17) for one transaction. Paid money counts only when its
   * `total` (L1392) is the one we started: a FINISHED transaction for another
   * amount reads as `SIMPLEPAY_TOTAL_MISMATCH`, an ERROR, never as paid.
   */
  private async status(facts: SimplePayFacts) {
    const answer = await this.client.call<{
      transactions?: { transactionId: number; status?: string; total?: number | string }[]
    }>("query", { transactionIds: [String(facts.transactionId)] })
    const transaction = answer.transactions?.find(
      (t) => String(t.transactionId) === String(facts.transactionId)
    )
    const paid = transaction?.status === "FINISHED" || transaction?.status === "AUTHORIZED"
    if (paid && Number(transaction?.total) !== Number(facts.total)) {
      return SIMPLEPAY_TOTAL_MISMATCH
    }
    return transaction?.status
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const facts = factsOf(input.data)
    const status = await this.status(facts)
    return {
      status: simplePayStatusToSession(status),
      data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status } },
    }
  }

  /** One-step: the money is taken when SimplePay says FINISHED. Nothing to call. */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const facts = factsOf(input.data)
    const status = facts.status === "FINISHED" ? facts.status : await this.status(facts)
    if (status !== "FINISHED") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `The SimplePay transaction is ${status ?? "unknown"}, not FINISHED; nothing to capture`
      )
    }
    return { data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status } } }
  }

  /** REFUND (section 3.16): partial refunds up to the charged amount. */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const facts = factsOf(input.data)
    const answer = await this.client.call<{
      refundTransactionId: number
      refundTotal: number
      remainingTotal: number
    }>("refund", {
      transactionId: String(facts.transactionId),
      refundTotal: hufTotal(input.amount),
      currency: "HUF",
    })
    const previous = (input.data?.simplepay_refunds as unknown[] | undefined) ?? []
    return {
      data: {
        ...(input.data ?? {}),
        simplepay_refunds: [...previous, answer],
      },
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const facts = factsOf(input.data)
    const status = await this.status(facts)
    return {
      status: simplePayStatusToSession(status),
      data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status } },
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const facts = factsOf(input.data)
    const status = await this.status(facts)
    return { data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status } } }
  }

  /**
   * TRANSACTIONCANCEL (section 3.18) works only while the transaction is INIT
   * (L1541-1544). A paid transaction is not cancelled here: that is a refund.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const facts = factsOf(input.data)
    // The shared transaction belongs to the shipped session: dropping the
    // pickup session must not cancel the customer's payment for both.
    if (facts.joined) {
      return { data: input.data ?? {} }
    }
    const status = await this.status(facts)
    if (status === "INIT") {
      await this.client.call("transactioncancel", {
        transactionId: String(facts.transactionId),
        currency: "HUF",
      })
      return {
        data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status: "CANCELLED" } },
      }
    }
    return { data: { ...(input.data ?? {}), [SIMPLEPAY_DATA_KEY]: { ...facts, status } } }
  }

  /** A session that is thrown away: release its unstarted transaction, best effort. */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    try {
      return await this.cancelPayment(input)
    } catch {
      return { data: input.data ?? {} }
    }
  }

  /**
   * A changed amount needs a new transaction: a started one cannot change its
   * total. The same amount keeps the session as it is.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const facts = (input.data?.[SIMPLEPAY_DATA_KEY] as SimplePayFacts | undefined) ?? null
    const own = facts?.own ?? facts?.total
    if (own !== undefined && Number(own) === Number(input.amount)) {
      return { data: input.data ?? {} }
    }
    // A shared transaction cannot follow one cart's new amount alone: the
    // split's payment is started again, for both carts (P4-3c).
    if (facts && (facts.joined || (facts.own !== undefined && facts.own !== facts.total))) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The amount of a split cart's shared SimplePay payment changed; start the payment again"
      )
    }
    const started = await this.initiatePayment(input as unknown as InitiatePaymentInput)
    return { data: started.data ?? {} }
  }

  /**
   * The IPN needs an answer Medusa's generic webhook route cannot give (the
   * received data plus `receiveDate`, signed, L1189-1193), so it has its own
   * route (P4-3b). Nothing arrives here.
   */
  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default SimplePayProviderService
