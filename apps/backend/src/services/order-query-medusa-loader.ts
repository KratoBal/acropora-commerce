import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../modules/order-business-status"
import OrderBusinessStatusModuleService from "../modules/order-business-status/service"
import type { OrderQueryLoader } from "./order-query-loader"

/**
 * THE ORDER LIST'S DATABASE SIDE (the Acropora OS "Rendelések" page reads it
 * through `GET /admin/order-overview`). The projection and its batching are
 * `order-query-projection.ts` and `order-query-loader.ts`; this file only
 * names the fields and asks Medusa's query and the business status module.
 */
export const ORDER_OVERVIEW_FIELDS = [
  "id",
  "customer_id",
  "display_id",
  "created_at",
  "total",
  "email",
  "currency_code",
  "metadata",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.phone",
  "shipping_methods.name",
  "shipping_methods.data",
  "payment_collections.status",
  "payment_collections.amount",
  "payment_collections.captured_amount",
  "payment_collections.refunded_amount",
  "payment_collections.payments.provider_id",
  // the live card hold's expiry (`hold_expires_at`)
  "payment_collections.payments.amount",
  "payment_collections.payments.created_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.captures.amount",
  // cash on delivery and bank transfer have no payment record, only a session
  "payment_collections.payment_sessions.provider_id",
  "payment_collections.payment_sessions.status",
]

// the customer-wide signals need only who ordered and the order's own facts
const CUSTOMER_ORDER_FIELDS = ["id", "customer_id", "display_id", "created_at", "total", "email"]

/** Money comes back as a big-number object; the projection works with plain numbers. */
const plain = (order: any) => ({
  ...order,
  total: Number(order.total),
  payment_collections: (order.payment_collections ?? []).filter(Boolean).map((collection: any) => ({
    ...collection,
    amount: collection.amount == null ? undefined : Number(collection.amount),
    captured_amount: collection.captured_amount == null ? undefined : Number(collection.captured_amount),
    refunded_amount: collection.refunded_amount == null ? undefined : Number(collection.refunded_amount),
    payments: (collection.payments ?? []).filter(Boolean).map((payment: any) => ({
      ...payment,
      amount: payment.amount == null ? undefined : Number(payment.amount),
      captures: (payment.captures ?? []).filter(Boolean).map((capture: any) => ({ amount: Number(capture.amount) })),
    })),
  })),
})

export const medusaOrderQueryLoader = (
  scope: MedusaContainer,
  page: { limit: number; offset: number }
): OrderQueryLoader => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const statuses = scope.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
  return {
    loadPage: async () => {
      const { data, metadata } = await query.graph({
        entity: "order",
        fields: ORDER_OVERVIEW_FIELDS,
        pagination: { skip: page.offset, take: page.limit, order: { created_at: "DESC" } },
      })
      return {
        orders: (data as any[]).map(plain),
        count: metadata?.count ?? data.length,
        offset: page.offset,
        limit: page.limit,
      }
    },
    loadOrdersForCustomers: async (customerIds) => {
      if (customerIds.length === 0) return []
      const { data } = await query.graph({
        entity: "order",
        fields: CUSTOMER_ORDER_FIELDS,
        filters: { customer_id: customerIds },
      })
      return (data as any[]).map(plain)
    },
    loadStatuses: async (orderIds) =>
      orderIds.length === 0
        ? []
        : ((await statuses.listOrderBusinessStatusModels({ order_id: orderIds })) as any[]),
    loadHistory: async (orderIds) =>
      orderIds.length === 0
        ? []
        : ((await statuses.listOrderBusinessStatusHistories({ order_id: orderIds })) as any[]),
  }
}
