import type { PaymentRole } from "../payment-eligibility"
import {
  SPLIT_FROM_ORDER_KEY,
  SPLIT_ORDER_IDS_KEY,
  type SplitBlock,
  type SplitOrder,
  planSplit,
  splitBlock,
} from "./plan"

/**
 * THE SPLIT, STEP BY STEP (card 0a14f739, C/3), in the order that leaves no
 * half state the OS cannot finish:
 *
 * 1. The request is recorded on A (`acropora_split_requests`): the moved
 *    lines and A's target quantities, BEFORE anything changes.
 * 2. A's lines are reduced (a Medusa order edit: its total, its
 *    reservations). FIRST, because every variant's stock is managed and some
 *    cannot be backordered (acrobot 26635, measured on the test shop: 1502
 *    managed, 10 without backorder): the moved units' reservation must be
 *    freed before B can take them.
 * 3. B is created with the moved lines, reserved where A's were, the same
 *    shipping method and point at 0 Ft (D1), and its own payment of the same
 *    kind: cash on delivery for its own total, no second fee (D3); pay at the
 *    shop. Its id goes on A's record at once.
 * 4. The link is written on A and B is given "Feldolgozásra vár" (D5).
 *
 * The OS sends a `request_id` per split. The same id again answers with the
 * B already made, or finishes a split that stopped half way: no second order
 * is made (one gap is left and named: B created and the write of its id on A
 * failing in the same second). A card-paid order waits for Balázs's decision
 * on how B is paid (D2); a paid order is not split in this round (D4).
 */
export const SPLIT_REQUESTS_KEY = "acropora_split_requests"

export type PlannedLine = Extract<ReturnType<typeof planSplit>, { status: "ok" }>["moved"][number] & {
  /** Where A's reservation of this line was: B's goes there. */
  location_id: string | null
}

export type SplitRequestRecord = {
  /** B, once created. */
  order_id: string | null
  moved: PlannedLine[]
  /** A's quantities after the split, per line. */
  remaining: Array<{ item_id: string; quantity: number }>
  done: boolean
}

export type SplitSource = SplitOrder & {
  display_id: number | string
  /** The order's payment kind; null when it has none we know. */
  payment_role: PaymentRole | null
  /** Any of its payments captured. */
  paid: boolean
  /** Where each line's reservation is, by line id. */
  reservation_locations: Record<string, string | null>
}

export type SplitOperations = {
  loadOrder(orderId: string): Promise<SplitSource | null>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
  /** Step 2: the lines to these quantities (0 removes); a line already there is left alone. */
  reduceLines(orderId: string, remaining: SplitRequestRecord["remaining"], actor: string): Promise<void>
  /** Step 3: the new order, its reservations and its payment; answers its id. */
  createSplitOrder(source: SplitSource, moved: PlannedLine[], metadata: Record<string, unknown>): Promise<{ id: string }>
  /** Step 4: "Feldolgozásra vár" by the system, if the order has no status yet. */
  startBusinessStatus(orderId: string): Promise<void>
  orderSummary(orderId: string): Promise<{ display_id: number | string; total: number } | null>
}

export type SplitResult =
  | { status: "not_found" }
  | { status: "blocked"; reason: SplitBlock | "card_pending" }
  | { status: "invalid"; message: string }
  | {
      status: "done"
      order_id: string
      display_id: number | string
      parent_order_id: string
      parent_total: number
      total: number
      payment_state: "none"
    }

/** What B carries over from A besides its lines: the ÁSZF acceptance and the customer's notes. */
const CARRIED_METADATA_KEYS = ["aszf_elfogadas", "acropora_customer_note", "acropora_carrier_note"]

const requestsOf = (metadata: Record<string, unknown> | null): Record<string, SplitRequestRecord> => {
  const value = metadata?.[SPLIT_REQUESTS_KEY]
  return value && typeof value === "object" ? (value as Record<string, SplitRequestRecord>) : {}
}

const withRecord = (metadata: Record<string, unknown> | null, requestId: string, record: SplitRequestRecord) => ({
  ...(metadata ?? {}),
  [SPLIT_REQUESTS_KEY]: { ...requestsOf(metadata), [requestId]: record },
})

export const splitOrder = async (
  orderId: string,
  input: { lines: Array<{ item_id: string; quantity: number }>; request_id: string; actor?: string },
  apiActor: string,
  ops: SplitOperations
): Promise<SplitResult> => {
  const source = await ops.loadOrder(orderId)
  if (!source) return { status: "not_found" }
  let record = requestsOf(source.metadata)[input.request_id]

  if (!record) {
    const block = splitBlock(source, source.paid)
    if (block) return { status: "blocked", reason: block }
    if (source.payment_role === "ONLINE_CARD" || source.payment_role === null) {
      return { status: "blocked", reason: "card_pending" }
    }
    const plan = planSplit(source, input.lines)
    if (plan.status === "invalid") return plan
    record = {
      order_id: null,
      moved: plan.moved.map((line) => ({ ...line, location_id: source.reservation_locations[line.from_item_id] ?? null })),
      remaining: plan.remaining,
      done: false,
    }
    await ops.setMetadata(source.id, withRecord(source.metadata, input.request_id, record))
  }

  if (!record.done) {
    await ops.reduceLines(source.id, record.remaining, input.actor ?? apiActor)

    if (!record.order_id) {
      const carried = Object.fromEntries(
        CARRIED_METADATA_KEYS.filter((key) => source.metadata?.[key] !== undefined).map((key) => [key, source.metadata![key]])
      )
      const created = await ops.createSplitOrder(source, record.moved, { ...carried, [SPLIT_FROM_ORDER_KEY]: source.id })
      record = { ...record, order_id: created.id }
      const afterEdit = (await ops.loadOrder(source.id))!
      await ops.setMetadata(source.id, withRecord(afterEdit.metadata, input.request_id, record))
    }

    const fresh = (await ops.loadOrder(source.id))!
    const linked = Array.isArray(fresh.metadata?.[SPLIT_ORDER_IDS_KEY]) ? (fresh.metadata![SPLIT_ORDER_IDS_KEY] as string[]) : []
    record = { ...record, done: true }
    await ops.setMetadata(source.id, {
      ...withRecord(fresh.metadata, input.request_id, record),
      [SPLIT_ORDER_IDS_KEY]: linked.includes(record.order_id!) ? linked : [...linked, record.order_id!],
    })
    await ops.startBusinessStatus(record.order_id!)
  }

  const [parent, created] = await Promise.all([ops.orderSummary(source.id), ops.orderSummary(record.order_id!)])
  return {
    status: "done",
    order_id: record.order_id!,
    display_id: created!.display_id,
    parent_order_id: source.id,
    parent_total: parent!.total,
    total: created!.total,
    payment_state: "none",
  }
}
