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
 *    home address. A problem report the customer filed shows only its case reference, its kind, its
 *    time and a two-step state: never the text, the phone number or the photos.
 *  - A MIXED CART IS TWO ORDERS and the customer ordered once: the sibling orders of the same cart
 *    come with the requested one, but only those whose own address matches too. The requested order
 *    is first.
 *
 * The attempt limits are the route's middleware (`attempt-limits.ts`); this file only decides.
 */
import type { StoredTracking } from "../order-tracking"
import { trackingOf } from "../order-tracking"
import type { ProblemKind } from "../../../modules/order-problem-report/types"

export type GuestOrderSource = {
  id: string
  display_id: number | string
  email: string | null
  created_at: Date | string | null
  total: number
  currency_code: string
  payment_status: string | null
  items: { id: string; title: string; quantity: number; total: number }[]
  shipping_method: {
    name: string
    data?: Record<string, unknown> | null
    /** the shipping option is the store pickup one (decided by the option id, never by the name) */
    store_pickup: boolean
  } | null
  metadata: Record<string, unknown> | null
}

export type GuestOrderStatus = {
  status: string
  label: string
  updated_at: string
  history: { to_label: string; created_at: string }[]
}

/** One problem report of the order, as the customer sees it again. */
export type GuestProblemReport = {
  /** the case reference the customer was given when filing */
  id: string
  kind: ProblemKind
  created_at: string
  /** received: the shop has it; in_progress: the shop's team took it over. No promise is made by either. */
  stage: "received" | "in_progress"
}

/** What the module stores of a report that the customer view needs (the rest never reaches it). */
export type StoredProblemReport = { id: string; kind: ProblemKind; created_at: Date | string; status: string }

/**
 * One withdrawal declaration of the order, as the customer sees it again: the reference, the time of receipt (the shop
 * server's) and the lines. No name and no stage: nothing is promised about what follows, the shop's team decides that.
 */
export type GuestWithdrawal = {
  id: string
  created_at: string
  item_ids: string[]
}

/** What the module stores of a declaration that the customer view needs (the rest never reaches it). */
export type StoredWithdrawal = { id: string; created_at: Date | string; item_ids: string[] }

export type GuestOrderView = {
  display_id: number | string
  created_at: string | null
  total: number
  currency_code: string
  /** a whitelisted Medusa payment status, or null */
  payment_status: string | null
  business_status: GuestOrderStatus | null
  items: { id: string; title: string; quantity: number; total: number }[]
  shipping: {
    method_name: string
    pickup_point: { name: string; address: string } | null
    /** the order is collected in the store (a mixed cart's live-animal order): the page names its block by this */
    store_pickup: boolean
  } | null
  tracking: StoredTracking | null
  /** the order's problem reports, the oldest first; empty when there are none */
  problem_reports: GuestProblemReport[]
  /** the order's withdrawal declarations, the oldest first; empty when there are none */
  withdrawals: GuestWithdrawal[]
  /**
   * the order holds a live animal (a product the OS marked with a livestock kind). The page keeps the withdrawal button
   * back from such an order until the owner and the lawyer say whether the right applies to a live animal. NOT the same
   * as `shipping.store_pickup`: the store pickup is offered for every cart, a live animal is only one reason for it.
   */
  live_animal: boolean
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

export const guestProblemReports = (stored: readonly StoredProblemReport[]): GuestProblemReport[] =>
  [...stored]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((report) => ({
      id: report.id,
      kind: report.kind,
      created_at: new Date(report.created_at).toISOString(),
      stage: report.status === "pulled" ? ("in_progress" as const) : ("received" as const),
    }))

export const guestWithdrawals = (stored: readonly StoredWithdrawal[]): GuestWithdrawal[] =>
  [...stored]
    .sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || String(a.id).localeCompare(String(b.id)),
    )
    .map((row) => ({
      id: row.id,
      created_at: new Date(row.created_at).toISOString(),
      item_ids: Array.isArray(row.item_ids) ? [...row.item_ids] : [],
    }))

/** The customer-safe shape of one order. Every field is named: nothing else of the source passes. */
export const guestOrderView = (
  source: GuestOrderSource,
  status: GuestOrderStatus | null,
  reports: readonly StoredProblemReport[] = [],
  withdrawals: readonly StoredWithdrawal[] = [],
  liveAnimal = false,
): GuestOrderView => ({
  display_id: source.display_id,
  created_at: iso(source.created_at),
  total: source.total,
  currency_code: source.currency_code,
  payment_status: source.payment_status && PAYMENT_STATUSES.has(source.payment_status) ? source.payment_status : null,
  business_status: status,
  items: source.items.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    total: item.total,
  })),
  shipping: source.shipping_method
    ? {
        method_name: source.shipping_method.name,
        pickup_point: pickupPointOf(source.shipping_method.data),
        store_pickup: source.shipping_method.store_pickup,
      }
    : null,
  tracking: trackingOf(source.metadata),
  problem_reports: guestProblemReports(reports),
  withdrawals: guestWithdrawals(withdrawals),
  live_animal: liveAnimal,
})

export type GuestOrderDeps = {
  findByDisplayId(displayId: number): Promise<GuestOrderSource | null>
  /** The other orders of the cart the order was placed from (not the order itself). */
  siblingsOf(orderId: string): Promise<GuestOrderSource[]>
  statusOf(orderId: string): Promise<GuestOrderStatus | null>
  /** The problem reports filed for the order. */
  problemReportsOf(orderId: string): Promise<StoredProblemReport[]>
  /** The withdrawal declarations made for the order. */
  withdrawalsOf(orderId: string): Promise<StoredWithdrawal[]>
  /** Whether the order holds a live animal (false when it cannot be read: the page then offers the button). */
  liveAnimalOf(orderId: string): Promise<boolean>
}

/**
 * THE ORDER'S OWN ID, for a thing the guest asks of ONE order (the invoice link): the same pair as the lookup, the same ONE
 * answer for every miss. Nothing of the order leaves with it but its id, and only to the shop's own servers.
 */
export const findGuestOrderId = async (
  input: { displayId: number; email: string },
  deps: Pick<GuestOrderDeps, "findByDisplayId">,
): Promise<string | null> => {
  const wanted = emailKey(input.email)
  if (wanted === "" || !Number.isSafeInteger(input.displayId) || input.displayId <= 0) return null
  const order = await deps.findByDisplayId(input.displayId)
  return order && emailKey(order.email) === wanted ? order.id : null
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
  return Promise.all(
    [order, ...siblings].map(async (source) =>
      guestOrderView(
        source,
        await deps.statusOf(source.id),
        await deps.problemReportsOf(source.id),
        await deps.withdrawalsOf(source.id),
        await deps.liveAnimalOf(source.id),
      ),
    ),
  )
}
