import { MedusaStoreRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../../modules/order-business-status"
import { guestPaymentKind, type GuestPaymentKind } from "../../../../../workflows/utils/guest-order/lookup"
import { buildProviderRoleMap, orderPaymentRoleOf } from "../../../../../workflows/utils/payment-providers"
import OrderBusinessStatusModuleService from "../../../../../modules/order-business-status/service"
import {
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../../../../../modules/order-business-status/types"

/**
 * THE SIGNED-IN CUSTOMER'S OWN ORDERS, AND NOTHING ELSE.
 *
 * Every read starts from the customer's own orders (`customer_id` from the
 * session, never from the request), and only those ids reach the business
 * status module. Another customer's order is therefore not "forbidden" but
 * absent: 404, the same answer as an order that does not exist, so the
 * route cannot be used to probe which order ids are real.
 *
 * What a customer sees is the status and its history in the shop's words;
 * who moved it (`actor`, `source`) is internal and stays out.
 */

export type StoreOrderBusinessStatus = {
  order_id: string
  status: OrderBusinessStatus
  label: string
  updated_at: string
  /**
   * How the order is paid, by the guest page's rule (`guestPaymentKind`, commerce #891 and #894): the account page words its
   * payment status by it, so a released card hold does not read "fizetés törölve" and cash on delivery does not read "fizetésre
   * vár". `null` when the shop cannot tell; absent from an older shop.
   */
  payment_kind: GuestPaymentKind | null
}

/** The fields the payment kind needs: Medusa's status, the stored payment state, the payment provider. No address or name. */
const PAYMENT_KIND_FIELDS = [
  "id",
  "status",
  "metadata",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.canceled_at",
  "payment_collections.payment_sessions.provider_id",
]

/** The payment kind of each of the given own orders, by order id. */
async function paymentKinds(
  req: MedusaStoreRequest,
  orderIds: string[],
  businessStatus: (orderId: string) => string | null,
): Promise<Map<string, GuestPaymentKind | null>> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: PAYMENT_KIND_FIELDS, filters: { id: orderIds } })
  const roles = buildProviderRoleMap()
  return new Map(
    ((data ?? []) as any[]).filter(Boolean).map((order) => {
      const status = businessStatus(order.id)
      return [
        String(order.id),
        guestPaymentKind(
          {
            metadata: order.metadata ?? null,
            payment_role: orderPaymentRoleOf(order, roles),
            order_status: typeof order.status === "string" ? order.status : null,
          },
          status ? { status } : null,
        ),
      ]
    }),
  )
}

export type StoreOrderBusinessStatusDetail = StoreOrderBusinessStatus & {
  history: {
    from_status: OrderBusinessStatus | null
    from_label: string | null
    to_status: OrderBusinessStatus
    to_label: string
    created_at: string
  }[]
}

const label = (status: string): string =>
  ORDER_BUSINESS_STATUS_LABELS[status as OrderBusinessStatus] ?? status

const iso = (value: Date | string): string => new Date(value).toISOString()

export function customerIdOf(req: MedusaStoreRequest): string {
  const customerId = req.auth_context?.actor_id
  if (!customerId)
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "A signed-in customer is required",
    )
  return customerId
}

/** The ids of the customer's own orders, optionally narrowed to one. */
export async function ownOrderIds(
  req: MedusaStoreRequest,
  customerId: string,
  orderId?: string,
): Promise<string[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: orderId
      ? { customer_id: customerId, id: orderId }
      : { customer_id: customerId },
  })
  return (data as { id: string }[]).map((order) => order.id)
}

function service(req: MedusaStoreRequest): OrderBusinessStatusModuleService {
  return req.scope.resolve<OrderBusinessStatusModuleService>(
    ORDER_BUSINESS_STATUS_MODULE,
  )
}

export async function listStatuses(
  req: MedusaStoreRequest,
  orderIds: string[],
): Promise<StoreOrderBusinessStatus[]> {
  if (orderIds.length === 0) return []
  const statuses = await service(req).listOrderBusinessStatusModels({
    order_id: orderIds,
  })
  const statusOf = new Map(statuses.map((row) => [row.order_id, String(row.status)]))
  const kinds = await paymentKinds(req, orderIds, (id) => statusOf.get(id) ?? null)
  return statuses.map((row) => ({
    order_id: row.order_id,
    status: row.status as OrderBusinessStatus,
    label: label(row.status),
    updated_at: iso(row.updated_at),
    payment_kind: kinds.get(row.order_id) ?? null,
  }))
}

/** One own order's status and history; null when it has none yet. */
export async function statusDetail(
  req: MedusaStoreRequest,
  orderId: string,
): Promise<StoreOrderBusinessStatusDetail | null> {
  try {
    const { status, history } =
      await service(req).retrieveOrderBusinessStatusForOrder(orderId)
    const kinds = await paymentKinds(req, [orderId], () => String(status.status))
    return {
      order_id: status.order_id,
      status: status.status as OrderBusinessStatus,
      label: label(status.status),
      updated_at: iso(status.updated_at),
      payment_kind: kinds.get(orderId) ?? null,
      history: history.map((row) => ({
        from_status: (row.from_status as OrderBusinessStatus | null) ?? null,
        from_label: row.from_status ? label(row.from_status) : null,
        to_status: row.to_status as OrderBusinessStatus,
        to_label: label(row.to_status),
        created_at: iso(row.created_at),
      })),
    }
  } catch (error) {
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.NOT_FOUND
    )
      return null
    throw error
  }
}
