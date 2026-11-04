/**
 * THE GUEST ORDER PAGE'S LOOKUP (V1.1): the order number and the e-mail address the customer ordered
 * with show the order, with no account. The decision lives here, the Medusa side in `operations.ts`.
 *
 * WHO MAY SEE WHAT, AND WHY IT IS SAFE TO ANSWER AT ALL
 *  - The e-mail address is the second factor. An order number alone is a counter anyone can walk, so
 *    every miss is ONE answer (`null`): no such order, a wrong address and a malformed number are the
 *    same to the caller, and the route cannot be used to ask which order numbers exist.
 *  - The answer carries what the customer's own mail already showed: the lines, the amounts, the
 *    shipping method and the parcel shop's name and address (a public place), the business status,
 *    the payment state and the tracking. NEVER the e-mail address, a name, a phone number, or a
 *    home address.
 *  - A MIXED CART IS TWO ORDERS and the customer ordered once: the sibling orders of the same cart
 *    come with the requested one, but only those whose own address matches too. The requested order
 *    is first.
 *
 * The attempt limits are the route's middleware (`attempt-limits.ts`); this file only decides.
 */
import type { StoredTracking } from "../order-tracking"
import { trackingOf } from "../order-tracking"

export type GuestOrderSource = {
  id: string
  display_id: number | string
  email: string | null
  created_at: Date | string | null
  total: number
  currency_code: string
  payment_status: string | null
  items: { title: string; quantity: number; total: number }[]
  shipping_method: {
    name: string
    data?: Record<string, unknown> | null
  } | null
  metadata: Record<string, unknown> | null
}

export type GuestOrderStatus = {
  status: string
  label: string
  updated_at: string
  history: { to_label: string; created_at: string }[]
}

export type GuestOrderView = {
  display_id: number | string
  created_at: string | null
  total: number
  currency_code: string
  /** a whitelisted Medusa payment status, or null */
  payment_status: string | null
  business_status: GuestOrderStatus | null
  items: { title: string; quantity: number; total: number }[]
  shipping: {
    method_name: string
    pickup_point: { name: string; address: string } | null
  } | null
  tracking: StoredTracking | null
}

const PAYMENT_STATUSES = new Set([
  "not_paid",
  "awaiting",
  "authorized",
  "partially_authorized",
  "captured",
  "partially_captured",
  "partially_refunded",
  "refunded",
  "canceled",
  "requires_action",
])

/** An address as a comparison key: trimmed, lower case. */
export const emailKey = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase()

const pickupPointOf = (data: Record<string, unknown> | null | undefined) => {
  for (const key of ["foxpost_pickup_point", "gls_pickup_point"]) {
    const point = data?.[key] as { name?: unknown; address?: unknown } | undefined
    if (point && typeof point.name === "string" && point.name !== "")
      return {
        name: point.name,
        address: typeof point.address === "string" ? point.address : "",
      }
  }
  return null
}

const iso = (value: Date | string | null): string | null => {
  if (value === null) return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at.toISOString()
}

/** The customer-safe shape of one order. Every field is named: nothing else of the source passes. */
export const guestOrderView = (source: GuestOrderSource, status: GuestOrderStatus | null): GuestOrderView => ({
  display_id: source.display_id,
  created_at: iso(source.created_at),
  total: source.total,
  currency_code: source.currency_code,
  payment_status: source.payment_status && PAYMENT_STATUSES.has(source.payment_status) ? source.payment_status : null,
  business_status: status,
  items: source.items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    total: item.total,
  })),
  shipping: source.shipping_method
    ? {
        method_name: source.shipping_method.name,
        pickup_point: pickupPointOf(source.shipping_method.data),
      }
    : null,
  tracking: trackingOf(source.metadata),
})

export type GuestOrderDeps = {
  findByDisplayId(displayId: number): Promise<GuestOrderSource | null>
  /** The other orders of the cart the order was placed from (not the order itself). */
  siblingsOf(orderId: string): Promise<GuestOrderSource[]>
  statusOf(orderId: string): Promise<GuestOrderStatus | null>
}

/** The requested order first, then its cart-mates; `null` is the one answer for every miss. */
export const lookupGuestOrders = async (
  input: { displayId: number; email: string },
  deps: GuestOrderDeps,
): Promise<GuestOrderView[] | null> => {
  const wanted = emailKey(input.email)
  if (wanted === "" || !Number.isSafeInteger(input.displayId) || input.displayId <= 0) return null
  const order = await deps.findByDisplayId(input.displayId)
  if (!order || emailKey(order.email) !== wanted) return null
  const siblings = (await deps.siblingsOf(order.id))
    .filter((sibling) => sibling.id !== order.id && emailKey(sibling.email) === wanted)
    .sort((a, b) => Number(a.display_id) - Number(b.display_id))
  return Promise.all([order, ...siblings].map(async (source) => guestOrderView(source, await deps.statusOf(source.id))))
}
