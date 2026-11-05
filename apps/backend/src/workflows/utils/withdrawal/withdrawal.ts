import type { MedusaContainer } from "@medusajs/framework/types"

import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import type OrderWithdrawalModuleService from "../../../modules/order-withdrawal/service"

/**
 * THE WITHDRAWAL'S FLOW (V0.3), the Medusa side. The customer reaches the order with the same pair the guest lookup
 * takes (`accessibleOrder` of the problem report: the order number and the address it was ordered with); every miss
 * is ONE answer there, and this file only starts after it.
 */
const service = (container: MedusaContainer) =>
  container.resolve<OrderWithdrawalModuleService>(ORDER_WITHDRAWAL_MODULE)

export type WithdrawalInput = {
  customerName: string
  itemIds: string[]
}

export type CreateWithdrawalResult =
  | { status: "created"; id: string; createdAt: string }
  | { status: "bad_items" }
  /** a line of this declaration is already withdrawn from: `id` is the declaration that stands */
  | { status: "duplicate"; id: string }

/**
 * The declarations of the order that already cover one of these lines. Oldest first, the id as the tie-break: the
 * same order for every request, so that two racing sends agree on which one stands. A declaration never lapses:
 * a line that is withdrawn from stays so (the OS decides what follows), so there is no window as with the reports.
 */
const standingWithdrawals = async (svc: OrderWithdrawalModuleService, orderId: string, itemIds: string[]) => {
  const rows = await svc.listOrderWithdrawals({ order_id: orderId })
  return rows
    .filter((row) => (Array.isArray(row.item_ids) ? (row.item_ids as string[]) : []).some((id) => itemIds.includes(id)))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || String(a.id).localeCompare(String(b.id)),
    )
}

/**
 * Records the declaration. Every item must be this order's line (a violation is a 4xx the page can word; nothing is
 * written). A line already withdrawn from is a duplicate: the answer is the reference that stands, nothing is written.
 */
export const createWithdrawal = async (
  container: MedusaContainer,
  order: { id: string; itemIds: string[] },
  input: WithdrawalInput,
): Promise<CreateWithdrawalResult> => {
  const itemIds = [...new Set(input.itemIds)]
  if (itemIds.length === 0 || itemIds.some((id) => !order.itemIds.includes(id))) return { status: "bad_items" }
  const svc = service(container)
  const standing = await standingWithdrawals(svc, order.id, itemIds)
  if (standing.length) return { status: "duplicate", id: standing[0]!.id }
  const row = await svc.createOrderWithdrawals({
    order_id: order.id,
    customer_name: input.customerName,
    item_ids: itemIds,
    status: "new",
  })
  // two sends that raced past the check above: the fixed order decides which one stands, the other removes itself
  const standingNow = await standingWithdrawals(svc, order.id, itemIds)
  if (standingNow.length && standingNow[0]!.id !== row.id) {
    await svc.deleteOrderWithdrawals(row.id)
    return { status: "duplicate", id: standingNow[0]!.id }
  }
  return { status: "created", id: row.id, createdAt: new Date(row.created_at).toISOString() }
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
