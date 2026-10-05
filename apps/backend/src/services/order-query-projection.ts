import {
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../modules/order-business-status/types"
import {
  PARENT_ORDER_METADATA_KEY,
  PICKUP_ORDER_METADATA_KEY,
} from "../workflows/utils/split-completion"
import { holdExpiresAt, type OrderPaymentFacts } from "../workflows/utils/order-payment/state"

type QueryAddress = {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
} | null

type QueryPickupPoint = { id?: string; name?: string } | null | undefined

type QueryOrder = {
  id: string
  customer_id: string | null
  display_id: number
  created_at: Date
  total: number
  email: string
  currency_code?: string
  metadata?: Record<string, unknown> | null
  shipping_address?: QueryAddress
  billing_address?: QueryAddress
  shipping_methods?: {
    name: string
    data?: {
      foxpost_pickup_point?: QueryPickupPoint
      gls_pickup_point?: QueryPickupPoint
    } | null
  }[]
  payment_collections?: {
    status?: string
    amount?: number
    captured_amount?: number
    refunded_amount?: number
    payments?: QueryPayment[]
  }[]
}

type QueryPayment = {
  provider_id: string
  amount?: number
  created_at?: Date | string | null
  canceled_at?: Date | string | null
  captured_at?: Date | string | null
  captures?: { amount: number }[]
}

type QueryStatus = {
  order_id: string
  status: OrderBusinessStatus
}

type QueryStatusHistory = {
  order_id: string
  to_status: OrderBusinessStatus
  created_at: Date
}

export type OrderQueryRow = {
  id: string
  display_id: number
  created_at: Date
  total: number
  email: string
  business_status: {
    code: OrderBusinessStatus | null
    label: string | null
    changed_at: Date | null
  }
  shipping_method: string | null
  payment_method: string | null
  invoice_status: null
  /** The OS list (acropora-os "Rendelések"): who, where to, how it is paid, and its pair. */
  currency_code: string | null
  customer_name: string | null
  phone: string | null
  pickup_point: { id: string | null; name: string } | null
  payment: {
    provider_id: string | null
    status: string | null
    amount: number | null
    captured_amount: number | null
    refunded_amount: number | null
    /**
     * When the live card hold runs out (ISO), null without one: released,
     * captured, or not a card. The OS's "a zárolás 2 nap múlva lejár" reads it.
     */
    hold_expires_at: string | null
  } | null
  /** A mixed cart's other order: the pickup order of a shipped one, or the shipped parent. */
  related_order: { id: string; role: "pickup" | "parent" } | null
  customer_signals: {
    is_new_customer: boolean
    unsuccessful_closed_order_count: number
    has_other_open_order: boolean
    purchased_without_registration: boolean
  }
}

/**
 * The name in Hungarian order: family name first. The storefront's
 * `last_name` is the family name (labelled "Vezetéknév", `family-name`), so it
 * leads; the OS order page and the invoice use the same order.
 */
const nameOf = (address: QueryAddress | undefined): string | null => {
  const name = [address?.last_name, address?.first_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  return name || null
}

const pickupPointOf = (order: QueryOrder) => {
  const data = order.shipping_methods?.[0]?.data
  const point = data?.foxpost_pickup_point ?? data?.gls_pickup_point
  return point?.name ? { id: point.id ?? null, name: point.name } : null
}

const paymentOf = (order: QueryOrder): OrderQueryRow["payment"] => {
  const collection = order.payment_collections?.[0]
  if (!collection) return null
  return {
    provider_id: collection.payments?.[0]?.provider_id ?? null,
    status: collection.status ?? null,
    amount: collection.amount ?? null,
    captured_amount: collection.captured_amount ?? null,
    refunded_amount: collection.refunded_amount ?? null,
    hold_expires_at: holdExpiresAt({ metadata: order.metadata, payments: paymentFactsOf(order) }),
  }
}

/** Every payment of every collection, as the payment state reads them. */
const paymentFactsOf = (order: QueryOrder): OrderPaymentFacts[] =>
  (order.payment_collections ?? []).flatMap((collection) =>
    (collection.payments ?? []).map((payment, index) => ({
      id: String(index),
      provider_id: payment.provider_id ?? null,
      amount: payment.amount ?? 0,
      created_at: payment.created_at ?? null,
      canceled_at: payment.canceled_at ?? null,
      captured_at: payment.captured_at ?? null,
      captured: (payment.captures ?? []).reduce((sum, capture) => sum + capture.amount, 0),
    }))
  )

// the keys `linkOrders` writes on the two orders of a mixed cart
const relatedOrderOf = (order: QueryOrder): OrderQueryRow["related_order"] => {
  const pickup = order.metadata?.[PICKUP_ORDER_METADATA_KEY]
  if (typeof pickup === "string" && pickup) return { id: pickup, role: "pickup" }
  const parent = order.metadata?.[PARENT_ORDER_METADATA_KEY]
  if (typeof parent === "string" && parent) return { id: parent, role: "parent" }
  return null
}

const isOpen = (status: OrderBusinessStatus | undefined) =>
  status !== "closed" && status !== "closed_unsuccessfully"

/**
 * Joins page rows to three already-batched datasets. No database access is
 * permitted here: that keeps the per-page query budget observable in the
 * loader and prevents a future row-level lookup from slipping in.
 */
export const projectOrderQueryRows = ({
  pageOrders,
  customerOrders,
  statuses,
  history,
}: {
  pageOrders: QueryOrder[]
  customerOrders: QueryOrder[]
  statuses: QueryStatus[]
  history: QueryStatusHistory[]
}): OrderQueryRow[] => {
  const statusByOrderId = new Map(
    statuses.map((status) => [status.order_id, status.status]),
  )
  const latestHistoryByOrderId = new Map<string, QueryStatusHistory>()

  for (const event of history) {
    const latest = latestHistoryByOrderId.get(event.order_id)

    if (!latest || latest.created_at < event.created_at) {
      latestHistoryByOrderId.set(event.order_id, event)
    }
  }

  const ordersByCustomerId = new Map<string, QueryOrder[]>()

  for (const order of customerOrders) {
    if (!order.customer_id) {
      continue
    }

    const customerOrders = ordersByCustomerId.get(order.customer_id) ?? []
    customerOrders.push(order)
    ordersByCustomerId.set(order.customer_id, customerOrders)
  }

  return pageOrders.map((order) => {
    const status = statusByOrderId.get(order.id)
    const latestHistory = latestHistoryByOrderId.get(order.id)
    const customerOrders = order.customer_id
      ? ordersByCustomerId.get(order.customer_id) ?? []
      : []
    const otherOrders = customerOrders.filter(
      (customerOrder) => customerOrder.id !== order.id,
    )

    return {
      id: order.id,
      display_id: order.display_id,
      created_at: order.created_at,
      total: order.total,
      email: order.email,
      business_status: {
        code: status ?? null,
        label: status ? ORDER_BUSINESS_STATUS_LABELS[status] : null,
        changed_at: latestHistory?.created_at ?? null,
      },
      shipping_method: order.shipping_methods?.[0]?.name ?? null,
      payment_method: order.payment_collections?.[0]?.payments?.[0]?.provider_id ?? null,
      invoice_status: null,
      currency_code: order.currency_code ?? null,
      customer_name: nameOf(order.shipping_address) ?? nameOf(order.billing_address),
      phone:
        order.shipping_address?.phone?.trim() ||
        order.billing_address?.phone?.trim() ||
        null,
      pickup_point: pickupPointOf(order),
      payment: paymentOf(order),
      related_order: relatedOrderOf(order),
      customer_signals: {
        is_new_customer: !!order.customer_id && customerOrders.length === 1,
        unsuccessful_closed_order_count: otherOrders.filter(
          (otherOrder) =>
            statusByOrderId.get(otherOrder.id) === "closed_unsuccessfully",
        ).length,
        has_other_open_order: otherOrders.some((otherOrder) =>
          isOpen(statusByOrderId.get(otherOrder.id)),
        ),
        purchased_without_registration: !order.customer_id,
      },
    }
  })
}
