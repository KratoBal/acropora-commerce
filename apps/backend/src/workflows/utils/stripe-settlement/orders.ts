import { stripeShareFactsOf } from "../../../modules/stripe-capture/share"
import { STRIPE_PROVIDER_ID } from "../stripe-config"

/**
 * WHICH ORDERS A STRIPE PAYMENTINTENT PAID (A9, card 6339b04c): the pairing the OS settlement needs, read from the orders
 * themselves. A PaymentIntent is on a Medusa payment's `data`: `data.id` for a plain card payment, and for a MIXED cart's
 * shared payment `data.stripe_share.transactionId` (one intent, two orders; the pickup session carries the shipped one's).
 * Several orders for one intent are returned as several, never picked from: the OS decides (by the sum of the totals).
 *
 * Read only. The orders are read from `created_at` on: an intent's balance transaction is created at the CAPTURE, which can come
 * a week or more after the order (the hold), so the window starts well before the transactions it serves, and ends just after the
 * latest of them (the order comes before the charge).
 *
 * THE WINDOW'S LIMIT, stated (barracuda #823): the window starts `ORDER_LOOKBACK_DAYS` (45) days before the EARLIEST transaction on the
 * page. A refund's transaction is created on the refund's day, so a refund of an order older than that is not found: its `orders` is
 * an empty list, for the OS to review. That errs the right way (it never invents an order) and the OS shows it as unmatched.
 */
export type IntentOrder = {
  id: string
  display_id: number | null
  /** The order's total in major units (Medusa's, not Stripe's smallest unit). */
  total: number
  currency_code: string
}

export const ORDER_LOOKBACK_DAYS = 45
/**
 * THE UPPER END OF THE WINDOW (barracuda #823): an order exists BEFORE its charge (the hold is taken at the order, the charge at
 * the latest with it), so no order made after the LATEST transaction on the page can have paid it. Without this end the scan ran from
 * the earliest transaction's window up to today, and for an older payout the cap was spent on orders made after it, so lines
 * that did have an order came back `ORDERS_NOT_READ`. The margin only absorbs clocks that differ between Stripe and the shop.
 */
export const ORDER_UPPER_MARGIN_MINUTES = 60
const PAGE = 200
/** At most this many orders are read per request; past it the answer says it was cut (`orders_truncated`). */
export const ORDER_SCAN_CAP = 3000

/** The intent a Medusa payment belongs to, or null (not a Stripe payment, or no intent yet). */
export const intentOfPayment = (payment: { provider_id?: unknown; data?: unknown } | null | undefined): string | null => {
  if (!payment || payment.provider_id !== STRIPE_PROVIDER_ID) return null
  const shared = stripeShareFactsOf(payment.data)?.transactionId
  if (typeof shared === "string" && shared.startsWith("pi_")) return shared
  const own = (payment.data as { id?: unknown } | null | undefined)?.id
  return typeof own === "string" && own.startsWith("pi_") ? own : null
}

export const ORDER_INTENT_FIELDS = [
  "id",
  "display_id",
  "total",
  "currency_code",
  "created_at",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.data",
]

export const ordersByIntent = async (
  query: { graph(input: Record<string, unknown>): Promise<{ data?: unknown[] }> },
  wanted: ReadonlySet<string>,
  earliestTransactionUnix: number,
  latestTransactionUnix: number = Number.POSITIVE_INFINITY,
): Promise<{ orders: Map<string, IntentOrder[]>; truncated: boolean }> => {
  const found = new Map<string, IntentOrder[]>()
  if (wanted.size === 0) return { orders: found, truncated: false }
  const since = new Date(earliestTransactionUnix * 1000 - ORDER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  // no upper end without a known latest transaction (the old call shape): the scan then runs to the present, as before
  const createdAt: { $gte: string; $lte?: string } = { $gte: since }
  if (Number.isFinite(latestTransactionUnix))
    createdAt.$lte = new Date(latestTransactionUnix * 1000 + ORDER_UPPER_MARGIN_MINUTES * 60 * 1000).toISOString()
  let scanned = 0
  let truncated = false
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_INTENT_FIELDS,
      filters: { created_at: createdAt },
      pagination: { skip, take: PAGE, order: { created_at: "ASC" } },
    })
    const page = (data ?? []) as any[]
    for (const order of page) {
      const ids: (string | null)[] = (order.payment_collections ?? []).flatMap((collection: any) =>
        (collection.payments ?? []).map(intentOfPayment),
      )
      const intents = new Set<string>(ids.filter((id): id is string => !!id && wanted.has(id)))
      for (const intent of intents) {
        const list = found.get(intent) ?? []
        list.push({
          id: String(order.id),
          display_id: typeof order.display_id === "number" ? order.display_id : null,
          total: Number(order.total),
          currency_code: String(order.currency_code ?? "").toLowerCase(),
        })
        found.set(intent, list)
      }
    }
    scanned += page.length
    if (page.length < PAGE) break
    if (scanned >= ORDER_SCAN_CAP) {
      truncated = true
      break
    }
  }
  return { orders: found, truncated }
}

/**
 * The transactions page with the orders each intent paid. A transaction without an intent (a fee line, a payout) has an empty
 * `orders`; so has one whose intent no order carries (a payment taken outside the shop, or an order older than the window).
 * That is for the OS to review, so the answer never invents a match.
 */
export const attachOrders = async <T extends { transactions: { payment_intent: string | null; created: number }[] }>(
  query: Parameters<typeof ordersByIntent>[0],
  page: T,
): Promise<Omit<T, "transactions"> & { transactions: (T["transactions"][number] & { orders: IntentOrder[] })[]; orders_truncated: boolean }> => {
  const wanted = new Set(page.transactions.map((txn) => txn.payment_intent).filter((id): id is string => !!id))
  const earliest = page.transactions.reduce((min, txn) => Math.min(min, txn.created), Number.POSITIVE_INFINITY)
  const latest = page.transactions.reduce((max, txn) => Math.max(max, txn.created), Number.NEGATIVE_INFINITY)
  const { orders, truncated } = await ordersByIntent(
    query,
    wanted,
    Number.isFinite(earliest) ? earliest : 0,
    Number.isFinite(latest) ? latest : Number.POSITIVE_INFINITY,
  )
  return {
    ...page,
    transactions: page.transactions.map((txn) => ({ ...txn, orders: txn.payment_intent ? (orders.get(txn.payment_intent) ?? []) : [] })),
    orders_truncated: truncated,
  }
}
