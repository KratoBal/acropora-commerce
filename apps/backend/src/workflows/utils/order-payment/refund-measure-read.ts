import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { smallestUnit } from "../../../modules/stripe-capture/smallest-unit"
import { loadSide, ORDER_FIELDS } from "../shared-stripe-capture-operations"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import { orderReadout, type OrderReadout } from "./readout"

/**
 * THE READING PART OF THE TEST-REFUND MEASUREMENT (commerce card 04b6010e, task t-20261117-visszaterites-segedo), shared by the one-off script
 * `src/scripts/book-test-refund.ts` and the read-only admin route `GET /admin/refund-measure`.
 *
 * WHY IT IS SHARED: the first stage run of the script failed with no readable output (the Coolify task API gives no log), so the evidence
 * is read from the STATE instead, over HTTP, as often as needed. Both paths print the same fields from the same functions, so what the route
 * says about an order is what the script said about it.
 *
 * NOTHING HERE WRITES. It never carries a payment's `data`, the order's metadata, an e-mail address, a Stripe intent id or the key: only
 * amounts, ids of Medusa's own records, and Stripe's statuses.
 */

/** A GET on Stripe's REST API with the (test) key. */
export const stripeGet = async (key: string, path: string): Promise<{ status: number; body: any }> => {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${key}` } })
  return { status: response.status, body: await response.json().catch(() => null) }
}

/** Stripe's own word on a payment intent: `live` (null when not read) and the fields worth printing. The intent id never leaves this process. */
export const readIntent = async (key: string, intentId: string): Promise<{ live: boolean | null; read: Record<string, unknown> }> => {
  const intent = await stripeGet(key, `payment_intents/${encodeURIComponent(intentId)}`)
  if (intent.status === 200 && intent.body) {
    return {
      live: intent.body.livemode === true,
      read: { status: intent.body.status, livemode: intent.body.livemode, amount: intent.body.amount, currency: intent.body.currency, amount_received: intent.body.amount_received },
    }
  }
  return { live: null, read: { http_status: intent.status } }
}

export type StripeRefundsRead = {
  http_status: number
  refunds: { status: unknown; amount_smallest_unit: unknown; amount: number; currency: unknown }[]
}

/** The refunds Stripe lists for an intent: status, amount in the smallest unit and in forints (or the currency's own unit). */
export const readStripeRefunds = async (key: string, intentId: string, currencyCode: string): Promise<StripeRefundsRead> => {
  const refunds = await stripeGet(key, `refunds?payment_intent=${encodeURIComponent(intentId)}&limit=20`)
  const unit = smallestUnit(1, currencyCode)
  return {
    http_status: refunds.status,
    refunds: (refunds.body?.data ?? []).map((r: any) => ({ status: r.status, amount_smallest_unit: r.amount, amount: r.amount / unit, currency: r.currency })),
  }
}

/** The intent id inside a raw payment's `data` (a string), or null. Used only inside the process. */
export const intentIdOf = (rawPayment: any): string | null => (typeof rawPayment?.data?.id === "string" ? rawPayment.data.id : null)

/** What `loadSide` says, without its `metadata` and its payment `data`: the four fields the measurement reads. */
export const sideOf = (side: Awaited<ReturnType<typeof loadSide>>) =>
  side && { total: side.total, currency_code: side.currency_code, other_captured: side.other_captured, payment_canceled: side.payment_canceled }

/** The latest orders with a captured, not canceled Stripe payment (read only): the same rows the script's `list` mode prints. */
export const listMeasureOrders = async (query: any, limit: number) => {
  const { data } = await query.graph({
    entity: "order",
    fields: [...ORDER_FIELDS, "created_at", "display_id"],
    pagination: { take: 50, order: { created_at: "DESC" } },
  })
  return (data ?? [])
    .map((order: any) => ({ order, readout: orderReadout(order) }))
    .filter(({ readout }: { readout: OrderReadout }) => readout.collections.some((c) => c.payments.some((p) => p.provider_id === STRIPE_PROVIDER_ID && !p.canceled && p.captured_total > 0)))
    .slice(0, limit)
    .map(({ order, readout }: { order: any; readout: OrderReadout }) => ({
      order_id: order.id,
      display_id: order.display_id ?? null,
      created_at: order.created_at ?? null,
      currency: order.currency_code ?? null,
      total: order.total ?? null,
      payments: readout.collections.flatMap((c) =>
        c.payments.map((p) => ({ payment_id: p.id, provider: p.provider_id, canceled: p.canceled, captured: p.captured_total, refunded: p.refunded_total, refunds_field: p.refunds_field }))
      ),
    }))
}

/**
 * ONE ORDER'S STATE, as the measurement reads it: the payment figures as Medusa returns them (`readout`: type, value and finiteness of every
 * amount), `loadSide`'s own reading, and for every live Stripe payment what Stripe says about its intent and its refunds (test key only).
 * Returns null when the order does not exist.
 */
export const readOrderState = async (input: { container: any; key: string; orderId: string }) => {
  const query = input.container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: input.orderId }, fields: ORDER_FIELDS })
  const order: any = data?.[0]
  if (!order) return null
  const readout = orderReadout(order)
  const rawPayments = (order.payment_collections ?? []).flatMap((c: any) => c.payments ?? [])
  const payments: { payment_id: string | null; stripe_intent: Record<string, unknown> | null; stripe_refunds: StripeRefundsRead | null }[] = []
  for (const payment of readout.collections.flatMap((c) => c.payments)) {
    if (payment.provider_id !== STRIPE_PROVIDER_ID || payment.canceled) continue
    const intentId = intentIdOf(rawPayments.find((p: any) => p?.id === payment.id))
    const intent = intentId ? await readIntent(input.key, intentId) : null
    payments.push({
      payment_id: payment.id,
      stripe_intent: intent?.read ?? null,
      stripe_refunds: intentId ? await readStripeRefunds(input.key, intentId, String(intent?.read.currency ?? order.currency_code ?? "huf")) : null,
    })
  }
  const side = sideOf(await loadSide(input.container, input.orderId))
  return { order_id: input.orderId, readout, side, payments }
}
