import StripePaymentModule from "@medusajs/medusa/payment-stripe"
import { BigNumber, MedusaError } from "@medusajs/framework/utils"

import {
  STRIPE_CAPTURE_PARTS_KEY,
  type StripeCaptureParts,
  capturedPartKey,
  STRIPE_JOINED_KEY,
  STRIPE_JOINT_KEY,
  STRIPE_SHARE_KEY,
  type StripeShareFacts,
  stripeShareFactsOf,
} from "./share"
import { smallestUnit } from "./smallest-unit"

/**
 * THE CARD IS CAPTURED FOR THE AMOUNT MEDUSA BOOKS, NOT THE WHOLE AUTHORIZATION.
 *
 * Balázs, 2026-10-01 04:44 UTC (Eldöntendő thread, acrobot 25495): when an item
 * drops out, the capture takes the SMALLER amount in the first place, not the
 * whole amount followed by a refund. Test storefront only; SimplePay stays.
 *
 * WHY THE STOCK PROVIDER CANNOT: measured in the installed packages,
 * - `@medusajs/payment-stripe` 2.20.1 `capturePayment` calls
 *   `paymentIntents.capture(id)` with no `amount_to_capture`, so Stripe takes
 *   the whole authorized amount;
 * - `@medusajs/payment` 2.20.1 `capturePaymentFromProvider_` passes the
 *   provider only `data` and `context.idempotency_key`, never the amount.
 * A partial capture from the admin was therefore booked as partial by Medusa
 * and taken in full by Stripe.
 *
 * THE AMOUNT IS THE CAPTURE RECORD'S. The module creates the capture (with its
 * amount) in its own transaction BEFORE calling the provider, and passes the
 * capture's id as the idempotency key; this provider reads that record. If the
 * provider throws, the module deletes the capture record, so Medusa never books
 * an amount Stripe did not take.
 *
 * ONE CAPTURE PER CARD PAYMENT. Stripe captures a PaymentIntent once; whatever
 * is not captured is released. A second capture is therefore refused (unless
 * it is the same capture retried), instead of being booked by Medusa while
 * Stripe takes nothing.
 */
type StripeIntent = {
  id: string
  status: string
  currency: string
  amount_capturable: number
  amount_received: number
}

type CaptureRecords = {
  retrieve(
    id: string,
    config?: { select?: string[] }
  ): Promise<{ id: string; amount: unknown }>
}

const major = (value: unknown): number => Number(new BigNumber(value as any).numeric)

const StripeProviderService = (
  StripePaymentModule as unknown as {
    services: (new (cradle: Record<string, unknown>, options: unknown) => any)[]
  }
).services.find((service: any) => service.identifier === "stripe")!

export default class AcroporaStripeService extends StripeProviderService {
  static identifier = "stripe"

  protected readonly captureRecords_: CaptureRecords | null

  constructor(cradle: Record<string, unknown>, options: unknown) {
    super(cradle, options)
    /*
      THE CRADLE THROWS ON A MISSING KEY (awilix proxy), so the lookup is
      guarded: without the record service every capture is refused below,
      loudly, rather than this constructor stopping the payment module.
    */
    let records: CaptureRecords | null = null
    try {
      records = (cradle.captureService as CaptureRecords | undefined) ?? null
    } catch {
      records = null
    }
    this.captureRecords_ = records
  }

  /** The share facts travel with every answer that replaces the session data. */
  private keepShare(
    input: { data?: Record<string, unknown> },
    out: { data?: Record<string, unknown>; [key: string]: unknown }
  ) {
    const share = stripeShareFactsOf(input.data)
    return share ? { ...out, data: { ...(out.data ?? {}), [STRIPE_SHARE_KEY]: share } } : out
  }

  async initiatePayment(input: {
    amount: unknown
    currency_code: string
    data?: Record<string, unknown>
    context?: Record<string, unknown>
  }): Promise<any> {
    const {
      [STRIPE_JOINT_KEY]: joint,
      [STRIPE_JOINED_KEY]: joined,
      ...data
    } = (input.data ?? {}) as Record<string, unknown>
    const own = major(input.amount)

    // THE PICKUP SESSION: the shipped session's intent, no new one. The two
    // parts must be exactly the intent's amount (as with SimplePay).
    if (joined) {
      const facts = joined as Partial<StripeShareFacts>
      if (
        !facts.transactionId ||
        Number(facts.own) + own !== Number(facts.total)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "A joined Stripe session needs the shared payment, whose amount is exactly the two carts together"
        )
      }
      const stripe = (this as any).stripe_
      const intent = await stripe.paymentIntents.retrieve(facts.transactionId)
      const status = (this as any).getStatus(intent) as { status: string }
      return {
        id: intent.id,
        status: status.status,
        data: {
          id: intent.id,
          [STRIPE_SHARE_KEY]: {
            transactionId: intent.id,
            total: Number(facts.total),
            own,
            joined: true,
          } satisfies StripeShareFacts,
        },
      }
    }

    // THE SHIPPED SESSION OF A SPLIT: one intent for both carts.
    if (joint) {
      const total = major((joint as { total?: unknown }).total)
      if (!(total >= own)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `A joint Stripe total (${total}) cannot be less than this session's amount (${own})`
        )
      }
      const started = await super.initiatePayment({ ...input, amount: total, data })
      return {
        ...started,
        data: {
          ...(started.data ?? {}),
          [STRIPE_SHARE_KEY]: { transactionId: started.id, total, own } satisfies StripeShareFacts,
        },
      }
    }

    return super.initiatePayment({ ...input, data })
  }

  async authorizePayment(input: { data?: Record<string, unknown> }): Promise<any> {
    return this.keepShare(input, await super.authorizePayment(input))
  }

  async retrievePayment(input: { data?: Record<string, unknown> }): Promise<any> {
    return this.keepShare(input, await super.retrievePayment(input))
  }

  /**
   * A shared intent cannot follow one cart's new amount: the split's payment is
   * started again, for both carts (as with SimplePay). The same amount keeps it.
   */
  async updatePayment(input: {
    amount: unknown
    data?: Record<string, unknown>
    [key: string]: unknown
  }): Promise<any> {
    const share = stripeShareFactsOf(input.data)
    if (share) {
      if (major(input.amount) === Number(share.own)) {
        return { data: input.data ?? {} }
      }
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The amount of a split cart's shared Stripe payment changed; start the payment again"
      )
    }
    return super.updatePayment(input)
  }

  /** The shared intent belongs to the shipped session: dropping the pickup one must not cancel it. */
  async cancelPayment(input: { data?: Record<string, unknown> }): Promise<any> {
    if (stripeShareFactsOf(input.data)?.joined) {
      return { data: input.data ?? {} }
    }
    return super.cancelPayment(input)
  }

  async deletePayment(input: { data?: Record<string, unknown> }): Promise<any> {
    return this.cancelPayment(input)
  }

  /**
   * ONE CAPTURE FOR BOTH ORDERS. A payment may book its capture only for the
   * part recorded for it: the payment carrying the parts (the shipped one)
   * makes the single Stripe capture for their sum and records them on the
   * intent; any later capture (the pickup payment, or a retry) is accepted only
   * when the intent is captured and its recorded part equals the booked amount.
   * Anything else is refused, so Medusa never books what Stripe did not take.
   */
  private async captureShared(
    share: StripeShareFacts,
    data: Record<string, unknown>,
    captureId: string | undefined
  ): Promise<{ data: Record<string, unknown> }> {
    if (!captureId || !this.captureRecords_) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The card capture has no capture record to take its amount from"
      )
    }
    const record = (await this.captureRecords_.retrieve(captureId, {
      select: ["id", "amount", "payment_id"],
    })) as { amount: unknown; payment_id?: string }
    const paymentId = record.payment_id
    const stripe = (this as any).stripe_
    const intent = await stripe.paymentIntents.retrieve(share.transactionId)
    const units = smallestUnit(Number(record.amount), intent.currency)
    const parts = data[STRIPE_CAPTURE_PARTS_KEY] as StripeCaptureParts | undefined
    const kept = { ...data, [STRIPE_SHARE_KEY]: share }

    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The capture record names no payment"
      )
    }

    if (intent.status === "requires_capture" && parts && parts.parts[paymentId] === units) {
      const sum = Object.values(parts.parts).reduce((total, part) => total + part, 0)
      if (sum !== parts.total || parts.total > intent.amount_capturable) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `The shared card payment cannot be captured for ${parts.total} (authorized ${intent.amount_capturable})`
        )
      }
      await stripe.paymentIntents.update(share.transactionId, {
        metadata: Object.fromEntries(
          Object.entries(parts.parts).map(([id, part]) => [capturedPartKey(id), String(part)])
        ),
      })
      const captured = await stripe.paymentIntents.capture(
        share.transactionId,
        { amount_to_capture: parts.total },
        { idempotencyKey: captureId }
      )
      return { data: { ...kept, id: captured.id } }
    }

    if (
      intent.status === "succeeded" &&
      intent.metadata?.[capturedPartKey(paymentId)] === String(units)
    ) {
      return { data: kept }
    }

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This card payment is shared by two orders; it is captured for both together at shipment"
    )
  }

  async capturePayment({
    data,
    context,
  }: {
    data?: Record<string, unknown>
    context?: { idempotency_key?: string }
  }): Promise<{ data: Record<string, unknown> }> {
    // THE SHARED PAYMENT IS CAPTURED TOGETHER, at "Kiszállítás" (see share.ts).
    const share = stripeShareFactsOf(data)
    if (share) {
      return this.captureShared(share, data ?? {}, context?.idempotency_key)
    }

    const id = data?.id as string | undefined
    const captureId = context?.idempotency_key

    if (!id || !captureId || !this.captureRecords_) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The card capture has no capture record to take its amount from"
      )
    }

    const record = await this.captureRecords_.retrieve(captureId, {
      select: ["id", "amount"],
    })
    const stripe = (this as any).stripe_
    const intent: StripeIntent = await stripe.paymentIntents.retrieve(id)
    const units = smallestUnit(Number(record.amount), intent.currency)

    if (intent.status === "succeeded") {
      /*
        ALREADY CAPTURED. Only the SAME capture retried (a lost answer) may pass:
        Stripe replays the original result for the same idempotency key (the
        capture record's id). A new capture has a new key, and Stripe refuses
        it; telling the two apart by amount would let a second capture of the
        same amount be booked while Stripe takes nothing.
      */
      try {
        const replay = await stripe.paymentIntents.capture(
          id,
          { amount_to_capture: units },
          { idempotencyKey: captureId }
        )
        return { data: replay as Record<string, unknown> }
      } catch {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This card payment was already captured once; the rest of its authorization was released"
        )
      }
    }

    if (intent.status !== "requires_capture" || units > intent.amount_capturable) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `The card payment cannot be captured for ${record.amount} (status ${intent.status})`
      )
    }

    const captured = await stripe.paymentIntents.capture(
      id,
      { amount_to_capture: units },
      { idempotencyKey: captureId }
    )

    return { data: captured as Record<string, unknown> }
  }
}
