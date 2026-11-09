import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import type OrderWithdrawalModuleService from "../../../modules/order-withdrawal/service"
import { isStorePickupOption } from "../shipping-option-roles"
import type { AccessibleOrder } from "../problem-report/report"

/**
 * THE WITHDRAWAL'S FLOW (V0.3), the Medusa side. The customer reaches the order with the same pair the guest lookup
 * takes (`accessibleOrder` of the problem report: the order number and the address it was ordered with); every miss
 * is ONE answer there, and this file only starts after it.
 */
const service = (container: MedusaContainer) =>
  container.resolve<OrderWithdrawalModuleService>(ORDER_WITHDRAWAL_MODULE)

/**
 * The order of the SIGNED-IN customer, or null. The customer id comes from the session (never from the request) and is
 * the filter: another customer's order is not "forbidden" but absent, the same null as an order that does not exist, so
 * the route cannot be used to probe which order ids are real. Same shape as the guest pair opens (`accessibleOrder`).
 */
export const ownOrder = async (
  container: MedusaContainer,
  customerId: string,
  orderId: string,
): Promise<AccessibleOrder | null> => {
  if (!customerId || !orderId) return null
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId, customer_id: customerId } as Record<string, unknown>,
    fields: ["id", "display_id", "email", "customer_id", "items.id"],
  })
  const order = (data?.[0] ?? null) as {
    id: string
    display_id?: number | string
    email?: string | null
    customer_id?: string | null
    items?: ({ id: string } | null)[]
  } | null
  // the filter does the work; this is the net for a query layer that ignored it (the customer AND the order must match)
  if (!order || order.customer_id !== customerId || order.id !== orderId) return null
  return {
    id: order.id,
    itemIds: (order.items ?? []).filter(Boolean).map((item) => item!.id),
    displayId: order.display_id ?? "",
    email: order.email ?? null,
  }
}

/**
 * Whether the order is collected in the store (the live animals' order of a mixed cart): its LAST shipping method is
 * the store pickup option, the same rule the guest view applies (`isStorePickupOption`). The order must already be
 * proven the caller's (`ownOrder`); an order that cannot be read is NOT a pickup (false), so the answer never
 * withholds the button on a guess.
 */
export const storePickupOf = async (container: MedusaContainer, orderId: string): Promise<boolean> => {
  if (!orderId) return false
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId } as Record<string, unknown>,
    fields: ["id", "shipping_methods.shipping_option_id"],
  })
  const order = (data?.[0] ?? null) as { id: string; shipping_methods?: ({ shipping_option_id?: unknown } | null)[] } | null
  if (!order || order.id !== orderId) return false
  const method = (order.shipping_methods ?? []).filter(Boolean).at(-1)
  return isStorePickupOption(method?.shipping_option_id)
}

export type WithdrawalInput = {
  customerName: string
  itemIds: string[]
}

export type CreateWithdrawalResult =
  /** `itemIds` are the lines recorded; `skipped` the requested lines that were already withdrawn from, with the declaration that holds each */
  | { status: "created"; id: string; createdAt: string; itemIds: string[]; skipped: SkippedLine[] }
  | { status: "bad_items" }
  /** every requested line is already withdrawn from: `id` is the first declaration that stands, `itemIds` the lines */
  | { status: "duplicate"; id: string; itemIds: string[] }

export type SkippedLine = { itemId: string; withdrawalId: string }

/**
 * The lines among these that are already withdrawn from, with the declaration that holds each. Oldest claim first, the
 * id as the tie-break (the same order for every request). A declaration never lapses: a line that is withdrawn from
 * stays so (the OS decides what follows), so there is no window as with the reports.
 */
const standingLines = async (svc: OrderWithdrawalModuleService, orderId: string, itemIds: string[]) => {
  const rows = await svc.listOrderWithdrawalItems({ order_id: orderId, item_id: itemIds })
  return rows
    .map((row) => ({ itemId: String(row.item_id), withdrawalId: String(row.withdrawal_id), at: new Date(row.created_at).getTime() }))
    .sort((a, b) => a.at - b.at || a.withdrawalId.localeCompare(b.withdrawalId) || a.itemId.localeCompare(b.itemId))
}

/** A lost race can repeat only if other requests keep winning the very same lines; three rounds is already absurd. */
const MAX_ROUNDS = 3

/**
 * Records the declaration. Every item must be this order's line (a violation is a 4xx the page can word; nothing is
 * written). THE FREE LINES ARE RECORDED, THE TAKEN ONES ARE NAMED: a line already withdrawn from is skipped (named in
 * `skipped`, with the declaration that holds it) and the rest of the request still stands; only when EVERY requested
 * line is taken is it a duplicate. The exclusion is the database's (a unique claim per line): the declaration and the
 * claim of its lines are written in ONE transaction (`declareWithClaims`), so a declaration that loses the claim is
 * rolled back with it and never stands; the request goes another round with what is still free.
 */
export const createWithdrawal = async (
  container: MedusaContainer,
  order: { id: string; itemIds: string[] },
  input: WithdrawalInput,
): Promise<CreateWithdrawalResult> => {
  const requested = [...new Set(input.itemIds)]
  if (requested.length === 0 || requested.some((id) => !order.itemIds.includes(id))) return { status: "bad_items" }
  const svc = service(container)
  const skipped = new Map<string, string>()
  let free = requested
  for (let round = 0; round < MAX_ROUNDS; round++) {
    for (const line of await standingLines(svc, order.id, free)) if (!skipped.has(line.itemId)) skipped.set(line.itemId, line.withdrawalId)
    free = requested.filter((id) => !skipped.has(id))
    if (free.length === 0) {
      const firstId = [...skipped.values()][0]!
      return { status: "duplicate", id: firstId, itemIds: requested }
    }
    let row: { id: string; created_at: Date | string }
    try {
      // the declaration and the claim of its lines are ONE transaction: a lost claim leaves nothing behind
      row = await svc.declareWithClaims({ order_id: order.id, customer_name: input.customerName, item_ids: free })
    } catch (error) {
      // whether a line was taken meanwhile is read again: if one is, it was a lost race (another round with the rest)
      const lost = await standingLines(svc, order.id, free)
      if (lost.length === 0) throw error
      continue
    }
    return {
      status: "created",
      id: row.id,
      createdAt: new Date(row.created_at).toISOString(),
      itemIds: free,
      skipped: [...skipped].map(([itemId, withdrawalId]) => ({ itemId, withdrawalId })),
    }
  }
  throw new Error("withdrawal: the lines kept being claimed by other requests")
}

export type PulledWithdrawal = {
  id: string
  order_id: string
  customer_name: string
  item_ids: string[]
  status: string
  /** the time of receipt, set by the shop's server */
  created_at: string
  pulled_at: string | null
}

/** The declarations for the OS: the oldest first. */
export const listWithdrawalsForOs = async (
  container: MedusaContainer,
  filter: { status: string; limit: number },
): Promise<PulledWithdrawal[]> => {
  const rows = await service(container).listOrderWithdrawals(
    { status: filter.status },
    { order: { created_at: "ASC" }, take: filter.limit },
  )
  return rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    customer_name: row.customer_name,
    item_ids: Array.isArray(row.item_ids) ? (row.item_ids as string[]) : [],
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
    pulled_at: row.pulled_at ? new Date(row.pulled_at).toISOString() : null,
  }))
}

/** Marks a declaration pulled by the OS. Idempotent: a second call changes nothing and still answers pulled. */
export const markWithdrawalPulled = async (
  container: MedusaContainer,
  id: string,
  now: Date,
): Promise<"pulled" | "not_found"> => {
  const svc = service(container)
  const [row] = await svc.listOrderWithdrawals({ id })
  if (!row) return "not_found"
  if (row.status !== "pulled") await svc.updateOrderWithdrawals({ id, status: "pulled", pulled_at: now })
  return "pulled"
}
