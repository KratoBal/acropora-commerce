import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"

import type {
  CapturePaymentSide,
  SharedCaptureOperations,
} from "./shared-stripe-capture"
import { PICKUP_ORDER_METADATA_KEY } from "./split-completion"

type Container = MedusaContainer

const ORDER_FIELDS = [
  "id",
  "total",
  "currency_code",
  "metadata",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.amount",
  "payment_collections.payments.data",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.created_at",
  "payment_collections.payments.captures.amount",
  "payment_collections.payments.refunds.amount",
]

export const loadSide = async (
  container: Container,
  orderId: string
): Promise<(CapturePaymentSide & { metadata: Record<string, unknown> | null }) | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: ORDER_FIELDS,
  })
  const order = data?.[0] as any

  if (!order) {
    return null
  }

  const captured = (candidate: any) =>
    (candidate.captures ?? []).reduce((sum: number, capture: any) => sum + Number(capture?.amount ?? 0), 0)
  /*
    REFUNDS ARE MEDUSA'S RECORDS ONLY (the same rule as order-cancel-guard-operations,
    acrobot 26265): never Stripe's refund list or a charge's `amount_refunded`, which
    also carries the unused rest of a hold released after a smaller capture.
  */
  const refunded = (candidate: any) =>
    (candidate.refunds ?? []).reduce((sum: number, refund: any) => sum + Number(refund?.amount ?? 0), 0)
  /*
    WHAT A PAYMENT STILL COVERS OF THE ORDER: its captures minus the refunds booked
    on it. A difference paid through a link and then handed back by hand (Stripe or
    Medusa) no longer pays that part of the order, and counting the full capture lets
    the hold's capture drop by the refunded amount: the customer pays less than the
    order's total (barracuda, commerce #561). Never below zero.
  */
  const covered = (candidate: any) => Math.max(0, captured(candidate) - refunded(candidate))
  const payments = (order.payment_collections ?? []).flatMap((collection: any) =>
    (collection?.payments ?? [])
      .filter(Boolean)
      .map((candidate: any) => ({
        ...candidate,
        collection_id: collection.id,
        collection_status: collection.status ?? null,
      }))
  )
  /*
    THE ORDER'S PAYMENT: the one not canceled. AN ORDER MAY CARRY TWO (plan
    section 5: the hold, and a difference paid through a link), and then it is
    the HOLD: the uncaptured one, of two the earlier. Taking the paid
    difference instead would read the order as captured, and Kiszállítás would
    never take the hold; an order edit would let Medusa cancel it.
  */
  const live = payments.filter((candidate: any) => !candidate.canceled_at)
  const uncaptured = live
    .filter((candidate: any) => captured(candidate) === 0)
    .sort((a: any, b: any) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
  const payment = uncaptured[0] ?? live[0]

  return {
    order_id: order.id,
    total: Number(order.total),
    currency_code: order.currency_code,
    metadata: order.metadata ?? null,
    payment: payment
      ? {
          id: payment.id,
          amount: Number(payment.amount),
          captured: captured(payment),
          data: payment.data ?? null,
          provider_id: payment.provider_id,
          collection_id: payment.collection_id,
          collection_status: payment.collection_status,
        }
      : null,
    // canceled with the order (the payments exist, none is live)
    payment_canceled: !payment && payments.length > 0,
    // a difference paid through a link, on the order's other live payments
    other_captured: live
      .filter((candidate: any) => candidate !== payment)
      .reduce((sum: number, candidate: any) => sum + covered(candidate), 0),
  }
}

/** The Medusa side of `captureSharedStripePayment`. */
export const sharedCaptureOperations = (container: Container): SharedCaptureOperations => ({
  loadPair: async (orderId) => {
    const shipped = await loadSide(container, orderId)

    if (!shipped) {
      return null
    }

    const pickupId = shipped.metadata?.[PICKUP_ORDER_METADATA_KEY]
    const pickup = typeof pickupId === "string" && pickupId ? await loadSide(container, pickupId) : null

    return { shipped, pickup }
  },

  /*
    `UpdatePaymentDTO` types only the id, but the module's `updatePayment`
    hands the object to the payment model's update (`@medusajs/payment` 2.20.1,
    payment-module.js 308), and the model has `data`. NOT measured on a live
    module yet (stage, part 3). If it did not persist, the shipped capture would
    lack the parts and the provider would refuse it: the status change fails
    loudly, nothing is captured.
  */
  setPaymentData: async (paymentId, data) => {
    await container
      .resolve(Modules.PAYMENT)
      .updatePayment({ id: paymentId, data } as { id: string })
  },

  capture: async (paymentId, amount) => {
    await capturePaymentWorkflow(container).run({
      input: { payment_id: paymentId, amount },
    })
  },
})
