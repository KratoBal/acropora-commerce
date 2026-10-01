import StripePaymentModule from "@medusajs/medusa/payment-stripe"
import { MedusaError } from "@medusajs/framework/utils"

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

  async capturePayment({
    data,
    context,
  }: {
    data?: Record<string, unknown>
    context?: { idempotency_key?: string }
  }): Promise<{ data: Record<string, unknown> }> {
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
