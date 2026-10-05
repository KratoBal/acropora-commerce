import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, PaymentCollectionStatus } from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  createOrderPaymentCollectionWorkflow,
  createOrUpdateOrderPaymentCollectionWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"

import { PARENT_ORDER_METADATA_KEY, PICKUP_ORDER_METADATA_KEY } from "../split-completion"
import { capturePlainStripePayment } from "../plain-stripe-capture"
import { captureSharedStripePayment } from "../shared-stripe-capture"
import { sharedCaptureOperations } from "../shared-stripe-capture-operations"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import type { LinkCollection, PayByLinkOperations } from "./pay-by-link"
import type { PaymentLinkOperations } from "./payment-link"
import type { ReleaseHoldOperations, ReleaseSide } from "./release-hold"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "total",
  "metadata",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.amount",
  "payment_collections.payments.data",
  "payment_collections.payments.created_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.captures.amount",
]

/** One order with every payment of every collection (canceled ones too). */
export const loadOrderPaymentSide = async (
  container: MedusaContainer,
  orderId: string
): Promise<ReleaseSide | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ORDER_FIELDS })
  const order = data?.[0] as any
  if (!order) return null
  return {
    order_id: order.id,
    display_id: order.display_id ?? null,
    total: Number(order.total),
    metadata: order.metadata ?? null,
    payments: (order.payment_collections ?? []).filter(Boolean).flatMap((collection: any) =>
      (collection.payments ?? []).filter(Boolean).map((payment: any) => ({
        id: payment.id,
        provider_id: payment.provider_id ?? null,
        amount: Number(payment.amount),
        data: payment.data ?? null,
        created_at: payment.created_at ?? null,
        canceled_at: payment.canceled_at ?? null,
        captured_at: payment.captured_at ?? null,
        captured: (payment.captures ?? []).reduce(
          (sum: number, capture: any) => sum + Number(capture?.amount ?? 0),
          0
        ),
        collection_id: collection.id,
        collection_status: collection.status ?? null,
      }))
    ),
  }
}

const setOrderMetadata = (container: MedusaContainer) => async (orderId: string, metadata: Record<string, unknown>) => {
  await container.resolve(Modules.ORDER).updateOrders([{ id: orderId, metadata }])
}

/** The Medusa side of `releaseHold`. */
export const releaseHoldOperations = (container: MedusaContainer): ReleaseHoldOperations => ({
  loadPair: async (orderId) => {
    const order = await loadOrderPaymentSide(container, orderId)
    if (!order) return null
    // called on the pickup half: its shipped parent pays for both, so it leads
    const parentId = order.metadata?.[PARENT_ORDER_METADATA_KEY]
    if (typeof parentId === "string" && parentId) {
      const parent = await loadOrderPaymentSide(container, parentId)
      if (parent) return { primary: parent, pickup: order }
    }
    const pickupId = order.metadata?.[PICKUP_ORDER_METADATA_KEY]
    const pickup = typeof pickupId === "string" && pickupId ? await loadOrderPaymentSide(container, pickupId) : null
    return { primary: order, pickup }
  },

  cancelPayment: async (paymentId) => {
    await container.resolve(Modules.PAYMENT).cancelPayment(paymentId)
  },

  cancelCollection: async (collectionId) => {
    await container.resolve(Modules.PAYMENT).updatePaymentCollections(collectionId, {
      status: PaymentCollectionStatus.CANCELED,
    })
  },

  setMetadata: setOrderMetadata(container),
})

/** The Medusa side of `sendPaymentLink`. */
export const paymentLinkOperations = (container: MedusaContainer): PaymentLinkOperations => ({
  loadPair: releaseHoldOperations(container).loadPair,

  ensureCollection: async (orderId) => {
    const { result } = await createOrUpdateOrderPaymentCollectionWorkflow(container).run({
      input: { order_id: orderId },
    })
    const collection = (Array.isArray(result) ? result[0] : result) as { id?: string; amount?: unknown } | undefined
    return collection?.id ? { id: collection.id, amount: Number(collection.amount) } : null
  },

  openCollection: async (orderId, amount) => {
    const { result } = await createOrderPaymentCollectionWorkflow(container).run({
      input: { order_id: orderId, amount },
    })
    const collection = (Array.isArray(result) ? result[0] : result) as { id?: string; amount?: unknown } | undefined
    if (!collection?.id) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `No payment collection was opened for order ${orderId}`)
    return { id: collection.id, amount: Number(collection.amount) }
  },

  setMetadata: setOrderMetadata(container),
})

/** The Medusa side of the link's payment (`startLinkSession`, `completeLinkPayment`). */
export const payByLinkOperations = (container: MedusaContainer): PayByLinkOperations => ({
  loadPair: releaseHoldOperations(container).loadPair,

  collection: async (collectionId): Promise<LinkCollection | null> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "payment_collection",
      filters: { id: collectionId },
      fields: [
        "id",
        "amount",
        "status",
        "payment_sessions.id",
        "payment_sessions.provider_id",
        "payment_sessions.status",
        "payment_sessions.data",
        "payment_sessions.created_at",
      ],
    })
    const collection = data?.[0] as any
    if (!collection) return null
    return {
      id: collection.id,
      amount: Number(collection.amount),
      status: collection.status ?? null,
      sessions: (collection.payment_sessions ?? []).filter(Boolean).map((session: any) => ({
        id: session.id,
        provider_id: session.provider_id,
        status: session.status ?? null,
        data: session.data ?? null,
        created_at: session.created_at ?? null,
      })),
    }
  },

  startSession: async (collectionId, data) => {
    const { result } = await createPaymentSessionsWorkflow(container).run({
      input: { payment_collection_id: collectionId, provider_id: STRIPE_PROVIDER_ID, data },
    })
    return ((result as any)?.data as Record<string, unknown> | undefined) ?? null
  },

  authorizeSession: async (sessionId) =>
    !!(await container.resolve(Modules.PAYMENT).authorizePaymentSession(sessionId, {})),

  captureCollection: async (collectionId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "payment_collection",
      filters: { id: collectionId },
      fields: ["payments.id", "payments.amount", "payments.canceled_at", "payments.captures.amount"],
    })
    const payments = ((data?.[0] as any)?.payments ?? []).filter((payment: any) => payment && !payment.canceled_at)
    for (const payment of payments) {
      const captured = (payment.captures ?? []).reduce((sum: number, c: any) => sum + Number(c?.amount ?? 0), 0)
      if (captured > 0) continue
      await capturePaymentWorkflow(container).run({ input: { payment_id: payment.id, amount: Number(payment.amount) } })
    }
  },

  capture: async (orderId) => {
    const ops = sharedCaptureOperations(container)
    const shared = await captureSharedStripePayment(orderId, ops)
    if (!shared.captured && shared.reason === "not_shared") await capturePlainStripePayment(orderId, ops)
  },

  setMetadata: setOrderMetadata(container),
})
