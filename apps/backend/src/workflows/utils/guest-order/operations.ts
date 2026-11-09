import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { ORDER_PROBLEM_REPORT_MODULE } from "../../../modules/order-problem-report"
import type OrderProblemReportModuleService from "../../../modules/order-problem-report/service"
import type { ProblemKind } from "../../../modules/order-problem-report/types"
import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import type OrderWithdrawalModuleService from "../../../modules/order-withdrawal/service"
import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import type OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import { ORDER_BUSINESS_STATUS_LABELS, type OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { medusaNumber } from "../medusa-number"
import { isStorePickupOption } from "../shipping-option-roles"
import { livestockKindsOfOrder } from "../webshop-mail/livestock-kinds"
import { lineTitle } from "../webshop-mail/operations"
import {
  guestProblemReports,
  guestWithdrawals,
  type GuestOrderDeps,
  type GuestOrderSource,
  type GuestOrderStatus,
  type GuestProblemReport,
  type GuestWithdrawal,
  type StoredProblemReport,
  type StoredWithdrawal,
} from "./lookup"

/**
 * The Medusa side of the guest order lookup. It asks for the fields the customer-safe view names and
 * for NO address, name or phone field: what is not requested cannot leak by a later edit of the view.
 */
const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "payment_status",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
]

const label = (status: string): string => ORDER_BUSINESS_STATUS_LABELS[status as OrderBusinessStatus] ?? status

const sourceOf = (order: any): GuestOrderSource => {
  const method = (order.shipping_methods ?? []).filter(Boolean).at(-1)
  return {
    id: order.id,
    display_id: order.display_id,
    email: order.email ?? null,
    created_at: order.created_at ?? null,
    total: medusaNumber(order.total, `The total of order ${order.id}`),
    currency_code: String(order.currency_code ?? "huf"),
    payment_status: typeof order.payment_status === "string" ? order.payment_status : null,
    items: (order.items ?? []).filter(Boolean).map((item: any) => ({
      id: String(item.id),
      title: lineTitle(item),
      quantity: medusaNumber(item.quantity, `The quantity of item ${item.id}`),
      total: medusaNumber(item.total, `The total of item ${item.id}`),
    })),
    shipping_method: method
      ? {
          name: String(method.name ?? ""),
          data: method.data ?? null,
          store_pickup: isStorePickupOption(method.shipping_option_id),
        }
      : null,
    metadata: order.metadata ?? null,
  }
}

/**
 * The problem reports filed for one order, as the module stores them. Only what the customer view names is read out: the
 * text, the phone and the photos stay in the module. Throws when the module cannot be read.
 */
const readStoredProblemReports = async (container: MedusaContainer, orderId: string): Promise<StoredProblemReport[]> => {
  const service = container.resolve<OrderProblemReportModuleService>(ORDER_PROBLEM_REPORT_MODULE)
  const rows = await service.listOrderProblemReports({ order_id: orderId }, { order: { created_at: "ASC" } })
  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind as ProblemKind,
    created_at: row.created_at as Date | string,
    status: String(row.status),
  }))
}

/**
 * The customer view of one order's problem reports, for the report route to answer with: the page then shows the
 * list from the answer itself and does not spend a guest lookup (which is rate limited) to refresh it. `null` when the
 * list cannot be read: the answer then leaves the field out and the page keeps the list it has.
 */
export const guestProblemReportsOf = async (
  container: MedusaContainer,
  orderId: string,
): Promise<GuestProblemReport[] | null> => {
  try {
    return guestProblemReports(await readStoredProblemReports(container, orderId))
  } catch (error) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn(message: string): void }
    logger.warn(`order ${orderId}: the problem reports could not be read (${(error as Error)?.name ?? "error"})`)
    return null
  }
}

/**
 * The withdrawal declarations made for one order, as the module stores them. Only what the customer view names is read
 * out: the name typed into the declaration stays in the module. Throws when the module cannot be read.
 */
const readStoredWithdrawals = async (container: MedusaContainer, orderId: string): Promise<StoredWithdrawal[]> => {
  const service = container.resolve<OrderWithdrawalModuleService>(ORDER_WITHDRAWAL_MODULE)
  const rows = await service.listOrderWithdrawals({ order_id: orderId }, { order: { created_at: "ASC" } })
  return rows.map((row) => ({
    id: String(row.id),
    created_at: row.created_at as Date | string,
    item_ids: Array.isArray(row.item_ids) ? (row.item_ids as string[]) : [],
  }))
}

/**
 * The customer view of one order's withdrawal declarations, for the declaration route to answer with: the page then
 * shows the list from the answer itself and does not spend a guest lookup (which is rate limited). `null` when the list
 * cannot be read: the answer then leaves the field out and the page keeps the list it has.
 */
export const guestWithdrawalsOf = async (
  container: MedusaContainer,
  orderId: string,
): Promise<GuestWithdrawal[] | null> => {
  try {
    return guestWithdrawals(await readStoredWithdrawals(container, orderId))
  } catch (error) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn(message: string): void }
    logger.warn(`order ${orderId}: the withdrawals could not be read (${(error as Error)?.name ?? "error"})`)
    return null
  }
}

/**
 * Whether the order holds a live animal: some product of it has a livestock kind in the shipping attributes (the OS
 * writes it from the product's root category; the shop never derives it from a name). The same source the order
 * confirmation's acclimatisation section reads. The read never throws: a failure answers false and the reader logs it.
 */
export const liveAnimalOfOrder = async (container: MedusaContainer, orderId: string): Promise<boolean> =>
  (await livestockKindsOfOrder(container, orderId)).length > 0

export const guestOrderOperations = (container: MedusaContainer): GuestOrderDeps => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const load = async (filters: Record<string, unknown>): Promise<GuestOrderSource[]> => {
    const { data } = await query.graph({
      entity: "order",
      filters,
      fields: ORDER_FIELDS,
    })
    return ((data ?? []) as any[]).filter(Boolean).map(sourceOf)
  }
  return {
    findByDisplayId: async (displayId) => (await load({ display_id: displayId }))[0] ?? null,
    siblingsOf: async (orderId) => {
      const { data: own } = await query.graph({
        entity: "order_cart",
        filters: { order_id: orderId },
        fields: ["cart_id"],
      })
      const cartId = (own?.[0] as { cart_id?: string } | undefined)?.cart_id
      if (!cartId) return []
      const { data: links } = await query.graph({
        entity: "order_cart",
        filters: { cart_id: cartId },
        fields: ["order_id"],
      })
      const ids = ((links ?? []) as { order_id?: string }[])
        .map((link) => link.order_id)
        .filter((id): id is string => Boolean(id) && id !== orderId)
      return ids.length ? load({ id: ids }) : []
    },
    problemReportsOf: async (orderId) => {
      try {
        return await readStoredProblemReports(container, orderId)
      } catch (error) {
        // the list of reports is an extra: when it cannot be read the order itself is still shown (the
        // customer must not lose the lookup over it). The log names the order and the error kind, nothing else.
        const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn(message: string): void }
        logger.warn(`guest order ${orderId}: the problem reports could not be read (${(error as Error)?.name ?? "error"})`)
        return []
      }
    },
    withdrawalsOf: async (orderId) => {
      try {
        return await readStoredWithdrawals(container, orderId)
      } catch (error) {
        // like the reports: the list is an extra, and the order is still shown when it cannot be read
        const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn(message: string): void }
        logger.warn(`guest order ${orderId}: the withdrawals could not be read (${(error as Error)?.name ?? "error"})`)
        return []
      }
    },
    liveAnimalOf: (orderId) => liveAnimalOfOrder(container, orderId),
    statusOf: async (orderId): Promise<GuestOrderStatus | null> => {
      const service = container.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
      try {
        const { status, history } = await service.retrieveOrderBusinessStatusForOrder(orderId)
        return {
          status: String(status.status),
          label: label(status.status),
          updated_at: new Date(status.updated_at).toISOString(),
          history: history.map((row: any) => ({
            to_label: label(row.to_status),
            created_at: new Date(row.created_at).toISOString(),
          })),
        }
      } catch (error) {
        // an order without a status yet is not an error here (the customer view does the same)
        if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) return null
        throw error
      }
    },
  }
}
