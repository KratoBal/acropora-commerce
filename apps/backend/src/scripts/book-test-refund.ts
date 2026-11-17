import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"

import { smallestUnit } from "../modules/stripe-capture/smallest-unit"
import { orderReadout } from "../workflows/utils/order-payment/readout"
import { applyRefusal, decodeInput, isStripeTestKey, planRefund } from "../workflows/utils/order-payment/refund-measure"
import { loadSide, ORDER_FIELDS } from "../workflows/utils/shared-stripe-capture-operations"

/**
 * BOOKS ONE TEST REFUND on a test order and prints what Medusa and Stripe (TEST mode) say about it, for the post-measurement of #615
 * (commerce cards 0cca8305 and 04b6010e; acrobot 54480). It is the only writer of the measurement, and it writes ONLY with
 * `mode: "apply"` AND a `confirm_order_id` that repeats the order id.
 *
 *   medusa exec ./src/scripts/book-test-refund.ts --input <base64 of the JSON below>
 *
 *   {"mode":"list","limit":5}                                    the latest orders with a captured Stripe payment (read only)
 *   {"mode":"plan","order_id":"order_01...","amount":500}        what would be booked and why not, if not (read only; default mode)
 *   {"mode":"apply","order_id":"order_01...","amount":500,"confirm_order_id":"order_01..."}   books it
 *
 * The refund runs through `refundPaymentWorkflow`, the workflow the admin route `POST /admin/payments/:id/refund` runs, in this
 * process: no admin login, no browser. The Stripe provider's own refund (the stripe-capture module) does the Stripe call. The Stripe
 * side is READ over its REST API with the same key (GET only): the intent's `livemode`, and the refunds on it.
 *
 * REFUSES unless STRIPE_API_KEY is a Stripe TEST key and the intent says it is not live. Prints amounts, ids and statuses only: never a
 * payment's `data`, the order's metadata, an e-mail address, or the key. Every output section starts with `MEASURE-RESULT` so a task
 * log can be searched for it.
 */
const out = (section: string, value: unknown) => {
  console.log(`MEASURE-RESULT ${section} ${JSON.stringify(value)}`)
}

const stripeGet = async (key: string, path: string): Promise<{ status: number; body: any }> => {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${key}` } })
  return { status: response.status, body: await response.json().catch(() => null) }
}

export default async function bookTestRefund({ container, args }: ExecArgs) {
  const input = decodeInput(args ?? [])
  const key = process.env.STRIPE_API_KEY?.trim() ?? ""
  const testKey = isStripeTestKey(key)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  if (input.mode === "list") {
    const { data } = await query.graph({
      entity: "order",
      fields: [...ORDER_FIELDS, "created_at", "display_id"],
      pagination: { take: 50, order: { created_at: "DESC" } },
    })
    const rows = (data ?? [])
      .map((order: any) => ({ order, readout: orderReadout(order) }))
      .filter(({ readout }) => readout.collections.some((c) => c.payments.some((p) => p.provider_id === "pp_stripe_stripe" && !p.canceled && p.captured_total > 0)))
      .slice(0, input.limit)
      .map(({ order, readout }) => ({
        order_id: order.id,
        display_id: order.display_id ?? null,
        created_at: order.created_at ?? null,
        currency: order.currency_code ?? null,
        total: order.total ?? null,
        payments: readout.collections.flatMap((c) =>
          c.payments.map((p) => ({ payment_id: p.id, provider: p.provider_id, canceled: p.canceled, captured: p.captured_total, refunded: p.refunded_total, refunds_field: p.refunds_field }))
        ),
      }))
    out("list", { test_key: testKey, orders: rows })
    return
  }

  const { data } = await query.graph({ entity: "order", filters: { id: input.order_id }, fields: ORDER_FIELDS })
  const order: any = data?.[0]
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, `order ${input.order_id} not found`)
  const before = orderReadout(order)

  // Stripe's own word on the intent: livemode and amount (the intent id stays inside this process)
  const first = planRefund({ readout: before, amount: input.amount, paymentId: input.payment_id, testKey, intentLive: null })
  const rawPayment = (order.payment_collections ?? []).flatMap((c: any) => c.payments ?? []).find((p: any) => p?.id === first.payment_id)
  const intentId: string | null = typeof rawPayment?.data?.id === "string" ? rawPayment.data.id : null
  let intentLive: boolean | null = null
  let intentRead: Record<string, unknown> | null = null
  if (testKey && intentId) {
    const intent = await stripeGet(key, `payment_intents/${encodeURIComponent(intentId)}`)
    if (intent.status === 200 && intent.body) {
      intentLive = intent.body.livemode === true
      intentRead = { status: intent.body.status, livemode: intent.body.livemode, amount: intent.body.amount, currency: intent.body.currency, amount_received: intent.body.amount_received }
    } else {
      intentRead = { http_status: intent.status }
    }
  }
  const plan = planRefund({ readout: before, amount: input.amount, paymentId: input.payment_id, testKey, intentLive })
  out("plan", { mode: input.mode, order_id: input.order_id, amount: input.amount, plan, stripe_intent: intentRead, readout_before: before })

  if (input.mode === "plan") return
  const refusal = applyRefusal(input, plan)
  if (refusal || !plan.payment_id) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, refusal ?? "no payment chosen")

  await refundPaymentWorkflow(container).run({
    input: { payment_id: plan.payment_id, amount: input.amount, note: input.note, created_by: "measurement" },
  })

  const { data: afterData } = await query.graph({ entity: "order", filters: { id: input.order_id }, fields: ORDER_FIELDS })
  const after = afterData?.[0] ? orderReadout(afterData[0]) : null
  const side = await loadSide(container, input.order_id)
  out("after", {
    order_id: input.order_id,
    payment_id: plan.payment_id,
    readout_after: after,
    // `loadSide`'s own reading: what a paid difference counts for once the refund is booked
    side: side && { total: side.total, currency_code: side.currency_code, other_captured: side.other_captured, payment_canceled: side.payment_canceled },
  })

  if (intentId) {
    const refunds = await stripeGet(key, `refunds?payment_intent=${encodeURIComponent(intentId)}&limit=20`)
    const currency = String(intentRead?.currency ?? order.currency_code ?? "huf")
    const unit = smallestUnit(1, currency)
    out("stripe_refunds", {
      http_status: refunds.status,
      refunds: (refunds.body?.data ?? []).map((r: any) => ({ status: r.status, amount_smallest_unit: r.amount, amount: r.amount / unit, currency: r.currency })),
    })
  }
}
