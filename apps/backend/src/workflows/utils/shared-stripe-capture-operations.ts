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
  "payment_collections.payments.id",
  "payment_collections.payments.amount",
  "payment_collections.payments.data",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captures.amount",
]

const loadSide = async (
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

  // The order's live payment: the one not canceled.
  const payment = (order.payment_collections ?? [])
    .flatMap((collection: any) => collection?.payments ?? [])
    .find((candidate: any) => candidate && !candidate.canceled_at)

  return {
    order_id: order.id,
    total: Number(order.total),
    currency_code: order.currency_code,
    metadata: order.metadata ?? null,
    payment: payment
      ? {
          id: payment.id,
          amount: Number(payment.amount),
          captured: (payment.captures ?? []).reduce(
            (sum: number, capture: any) => sum + Number(capture?.amount ?? 0),
            0
          ),
          data: payment.data ?? null,
        }
      : null,
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
