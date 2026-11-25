import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, PaymentCollectionStatus } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  createPaymentSessionsWorkflow,
  orderEditUpdateItemQuantityWorkflow,
} from "@medusajs/medusa/core-flows"

import { BANK_TRANSFER_PROVIDER_ID } from "../../../modules/acropora-transfer"
import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import { medusaNumber } from "../medusa-number"
import { buildProviderRoleMap } from "../payment-providers"
import { runOrderEdit } from "../run-order-edit"
import type { SwitchOrder, SwitchToTransferOperations } from "./switch-to-transfer"

/**
 * The Medusa side of `switchToBankTransfer`. `items.detail.quantity` is asked beside `items.quantity`: with the latter alone the
 * order module returns it undefined (measured on the test shop, order-split/operations.ts).
 */
const FIELDS = [
  "id",
  "total",
  "metadata",
  "items.id",
  "items.quantity",
  "items.detail.quantity",
  "items.metadata",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.payment_sessions.id",
  "payment_collections.payment_sessions.provider_id",
  "payment_collections.payment_sessions.status",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captures.amount",
]

const businessStatusOf = async (container: MedusaContainer, orderId: string): Promise<string | null> => {
  try {
    const { status } = await container
      .resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
      .retrieveOrderBusinessStatusForOrder(orderId)
    return String(status.status)
  } catch (error) {
    if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) return null
    throw error
  }
}

export const switchToTransferOperations = (container: MedusaContainer): SwitchToTransferOperations => ({
  load: async (orderId): Promise<SwitchOrder | null> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: FIELDS })
    const order = data?.[0] as any
    if (!order) return null
    return {
      id: order.id,
      total: medusaNumber(order.total, `The total of order ${order.id}`),
      metadata: order.metadata ?? null,
      business_status: await businessStatusOf(container, order.id),
      items: (order.items ?? []).filter(Boolean).map((item: any) => ({
        id: String(item.id),
        quantity: medusaNumber(item.detail?.quantity ?? item.quantity, `The quantity of item ${item.id}`),
        metadata: item.metadata ?? null,
      })),
      payment_collections: (order.payment_collections ?? []).filter(Boolean).map((collection: any) => ({
        id: String(collection.id),
        status: collection.status ?? null,
        payment_sessions: (collection.payment_sessions ?? []).filter(Boolean).map((session: any) => ({
          id: String(session.id),
          provider_id: String(session.provider_id),
          status: session.status ?? null,
        })),
        payments: (collection.payments ?? []).filter(Boolean).map((payment: any) => ({
          id: String(payment.id),
          provider_id: payment.provider_id ?? null,
          canceled_at: payment.canceled_at ?? null,
          captured: (payment.captures ?? []).reduce((sum: number, c: any) => sum + Number(c?.amount ?? 0), 0),
        })),
      })),
    }
  },

  roles: () => buildProviderRoleMap(),

  removeLines: async (orderId, itemIds, actor) => {
    await runOrderEdit(container, { order_id: orderId, actor, description: "Átállítás előre utalásra" }, async () => {
      await orderEditUpdateItemQuantityWorkflow(container).run({
        input: { order_id: orderId, items: itemIds.map((id) => ({ id, quantity: 0 })) },
      })
    })
  },

  // the module's cancel calls the provider (Stripe cancels the intent) and throws on a failure, as "Csúszik a szállítás" relies on
  cancelPayment: async (paymentId) => {
    await container.resolve(Modules.PAYMENT).cancelPayment(paymentId)
  },

  cancelCollection: async (collectionId) => {
    await container.resolve(Modules.PAYMENT).updatePaymentCollections(collectionId, {
      status: PaymentCollectionStatus.CANCELED,
    })
  },

  openCollection: async (orderId, amount) => {
    const { result } = await createOrderPaymentCollectionWorkflow(container).run({ input: { order_id: orderId, amount } })
    const collection = (Array.isArray(result) ? result[0] : result) as { id?: string; amount?: unknown } | undefined
    if (!collection?.id)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `No payment collection was opened for order ${orderId}`)
    return { id: collection.id, amount: Number(collection.amount) }
  },

  // checkout's shape: the session authorized once, so the provider answers PENDING_AUTHORIZATION and Medusa records that status
  // with no payment (payment-module 2.23.0, authorizePaymentSession); recordTransferReceipt looks for exactly that
  startTransferSession: async (collectionId) => {
    const { result } = await createPaymentSessionsWorkflow(container).run({
      input: { payment_collection_id: collectionId, provider_id: BANK_TRANSFER_PROVIDER_ID, data: {} },
    })
    const sessionId = String((result as any)?.id ?? "")
    if (!sessionId) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `No bank transfer session on ${collectionId}`)
    await container.resolve(Modules.PAYMENT).authorizePaymentSession(sessionId, {})
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "payment_session", filters: { id: sessionId }, fields: ["id", "status"] })
    return { id: sessionId, status: ((data?.[0] as any)?.status as string | undefined) ?? null }
  },

  setMetadata: async (orderId, metadata) => {
    await container.resolve(Modules.ORDER).updateOrders([{ id: orderId, metadata }])
  },
})
