import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"

import { GIVEN_BACK_METADATA_KEY } from "./cancel-on-unsuccessful-close"
import { orderCancelOperations } from "./order-cancel-guard-operations"

/**
 * THE HAND REFUND, SETTLED BY A PERSON (task commerce-kezi-refund-rendezve-20261125, card abf3f8f4; acrobot 61141). The unsuccessful close of an
 * order the shop cannot cancel (a shipped parcel) leaves a mark on the order's metadata (`unsuccessful_close_credits_given_back`:
 * `credit_lines`, `captured_unrefunded`, `at`) and the OS shows "Kézi visszatérítés kell". A refund made THROUGH THE SHOP clears the notice by
 * itself (the OS computes the outstanding amount); a refund started in the STRIPE DASHBOARD is invisible to the shop (measured in the code
 * 2026-11-25: Medusa's Stripe provider translates only `payment_intent.*` events, `charge.refunded` is NOT_SUPPORTED, and Medusa has no
 * refund action), so the notice stayed for ever. THE ANSWER IS A PERSON'S MARK: who settled it and when (and a short note), written ON THE
 * MARK, which stays: the trace of the close is kept, and the notice closes.
 *
 * The rules (pure, below): only an order that HAS the mark with an amount above zero; already settled is idempotent (the first settlement
 * is the one recorded: who and when do not change on a second press); an order whose outstanding captured amount is already zero in the shop
 * has nothing to settle by hand (the shop shows it as refunded: no second record).
 */
export const SETTLED_BY_MAX = 100
export const SETTLED_NOTE_MAX = 300

export type SettleInput = { settled_by: string; note?: string | null }

export type SettleDecision =
  | { action: "settle"; mark: Record<string, unknown> }
  | { action: "already"; mark: Record<string, unknown> }
  | { action: "no_mark" }
  | { action: "nothing_outstanding" }

/** A short text as stored: control characters out, spaces collapsed, cut to the limit; empty is no text. */
export const cleanSettleText = (value: string | null | undefined, max: number): string | null => {
  if (typeof value !== "string") return null
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
  return text || null
}

export const decideSettle = (
  metadata: Record<string, unknown> | null | undefined,
  outstanding: number | null,
  input: SettleInput,
  now: Date
): SettleDecision => {
  const mark = metadata?.[GIVEN_BACK_METADATA_KEY]
  if (!mark || typeof mark !== "object" || Array.isArray(mark)) return { action: "no_mark" }
  const current = mark as Record<string, unknown>
  const amount = Number(current.captured_unrefunded)
  if (!Number.isFinite(amount) || !(amount > 0)) return { action: "no_mark" }
  if (typeof current.settled_at === "string" && current.settled_at) return { action: "already", mark: current }
  // the shop itself shows the money back: nothing to settle by hand (a refund through the shop clears the notice on its own)
  if (typeof outstanding === "number" && !(outstanding > 0)) return { action: "nothing_outstanding" }
  const settledBy = cleanSettleText(input.settled_by, SETTLED_BY_MAX)
  if (!settledBy) return { action: "no_mark" }
  const note = cleanSettleText(input.note, SETTLED_NOTE_MAX)
  return {
    action: "settle",
    mark: { ...current, settled_at: now.toISOString(), settled_by: settledBy, ...(note ? { settled_note: note } : {}) },
  }
}

export type SettleResult =
  | { status: "settled" | "already"; settled_at: string; settled_by: string; settled_note: string | null }
  | { status: "not_found" }
  | { status: "no_mark" }
  | { status: "nothing_outstanding" }

const resultOf = (status: "settled" | "already", mark: Record<string, unknown>): SettleResult => ({
  status,
  settled_at: String(mark.settled_at),
  settled_by: String(mark.settled_by ?? ""),
  settled_note: typeof mark.settled_note === "string" ? mark.settled_note : null,
})

/**
 * The write. Only the mark's own key goes to Medusa, which merges the keys into the order's metadata itself (see `order-notes.ts`:
 * `MedusaInternalService.update` merges at the top level), and the value is the WHOLE mark (a nested object is replaced, not merged), read here.
 */
export const settleManualRefund = async (
  container: MedusaContainer,
  orderId: string,
  input: SettleInput,
  /** The admin user: Medusa records the change under this id. */
  userId: string,
  now: Date = new Date()
): Promise<SettleResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ["id", "metadata"] })
  const order = data?.[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
  if (!order) return { status: "not_found" }
  const facts = await orderCancelOperations(container, userId).load(orderId)
  const outstanding = facts ? facts.payments.reduce((total, payment) => total + (payment.canceled ? 0 : payment.outstanding), 0) : null
  const decision = decideSettle(order.metadata, outstanding, input, now)
  if (decision.action === "no_mark") return { status: "no_mark" }
  if (decision.action === "nothing_outstanding") return { status: "nothing_outstanding" }
  if (decision.action === "already") return resultOf("already", decision.mark)
  await updateOrderWorkflow(container).run({
    input: { id: orderId, metadata: { [GIVEN_BACK_METADATA_KEY]: decision.mark }, user_id: userId },
  })
  return resultOf("settled", decision.mark)
}
