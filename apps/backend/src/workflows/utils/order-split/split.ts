import type { PaymentRole } from "../payment-eligibility"
import type { SplitPayment } from "../webshop-mail/order-split-mail"
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
 * 5. The customer is told (`order-split-mail.ts`, acrobot 26651).
 *
 * A CARD ORDER (Balázs, 2026-10-06 05:31 UTC, "2"): A keeps its hold, and
 * Kiszállítás takes only A's reduced total (the capture takes the order's
 * current total; the rest of the hold is released). B is born unpaid, its
 * state "Fizetésre vár" (`kind: "split"`), WITHOUT a link: the OS sends the
 * link when B can ship (acrobot 26651, (b)), so the link's day-3 and day-6
 * deadlines count from then. Until paid, B cannot go out
 * (`refuseWhileAwaitingPayment`).
 *
 * The OS sends a `request_id` per split. The same id again answers with the
 * B already made, or finishes a split that stopped half way: no second order
 * is made (one gap is left and named: B created and the write of its id on A
 * failing in the same second). A paid order is not split in this round (D4),
 * nor a card order whose hold no longer stands.
 */
export const SPLIT_REQUESTS_KEY = "acropora_split_requests"

export type PlannedLine = Extract<ReturnType<typeof planSplit>, { status: "ok" }>["moved"][number] & {
  /** Where A's reservation of this line was: B's goes there. */
  location_id: string | null
  /**
   * A's reservation for the line was allowed over the stock (the variant's
   * backorder at checkout): B's takes the same, the stock is not asked twice
   * for what A already held. Missing on records made before 2026-10-06.
   */
  allow_backorder?: boolean
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
  /** The card order's payment state (`orderPaymentView`): a card order splits only while its hold stands. */
  payment_state: string
  /** Where each line's reservation is, by line id. */
  reservation_locations: Record<string, string | null>
  /** A's reservations, as the stock check and B's reservations need them. */
  reservations: Array<{
    line_item_id: string
    inventory_item_id: string
    location_id: string
    quantity: number
    allow_backorder: boolean
  }>
}

export type SplitOperations = {
  loadOrder(orderId: string): Promise<SplitSource | null>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
  /** Step 2: the lines to these quantities (0 removes); a line already there is left alone. */
  reduceLines(orderId: string, remaining: SplitRequestRecord["remaining"], actor: string): Promise<void>
  /**
   * Before anything changes: the Hungarian reason a moved line could not be
   * reserved for B, or null. What A holds for the line counts, because A's
   * reduction releases it first.
   */
  stockProblem(source: SplitSource, moved: PlannedLine[]): Promise<string | null>
  /**
   * Step 3: the new order, its reservations and its payment; answers its id.
   * If a step after the order's creation fails, the new order is canceled
   * before the error goes on: no order is left behind that the split does not
   * know.
   */
  createSplitOrder(source: SplitSource, moved: PlannedLine[], metadata: Record<string, unknown>): Promise<{ id: string }>
  /** Step 4: "Feldolgozásra vár" by the system, if the order has no status yet. */
  startBusinessStatus(orderId: string): Promise<void>
  /** Step 5: the customer's notice (one per split; a failure is logged, never undoes the split). */
  notifySplit(orderId: string, splitOrderId: string, payment: SplitPayment): Promise<void>
  orderSummary(orderId: string): Promise<{ display_id: number | string; total: number } | null>
}

export type SplitResult =
  | { status: "not_found" }
  | { status: "blocked"; reason: SplitBlock | "card_not_held" | "unknown_payment" }
  | { status: "invalid"; message: string }
  | {
      status: "done"
      order_id: string
      display_id: number | string
      parent_order_id: string
      parent_total: number
      total: number
      /** B's payment: a card order's waits for its own link; the others pay as A does. */
      payment_state: "awaiting_payment" | "none"
      /** An earlier split left half done was finished instead of this request's lines. */
      resumed: boolean
    }

/** What B carries over from A besides its lines: the ÁSZF acceptance and the customer's notes. */
const CARRIED_METADATA_KEYS = ["aszf_elfogadas", "acropora_customer_note", "acropora_carrier_note"]

const paymentOf = (source: SplitSource): SplitPayment =>
  source.payment_role === "ONLINE_CARD" ? "card" : source.payment_role === "COD" ? "cod" : "store"

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
  /*
    A SPLIT LEFT HALF DONE IS FINISHED FIRST, whatever request comes (acrobot
    26807, option (a); measured on the test shop, 2026-10-06: A's line was
    moved out, B could not be reserved, and the OS asks again with a new
    request id). Its record carries every step, so finishing it is the same
    idempotent run as sending its own request again; the new request's lines
    are not used.
  */
  const requests = requestsOf(source.metadata)
  const unfinished = Object.entries(requests).find(([, r]) => r && !r.done)
  const requestId = requests[input.request_id] ? input.request_id : (unfinished?.[0] ?? input.request_id)
  let record = requests[requestId]
  const resumed = requestId !== input.request_id

  if (!record) {
    const block = splitBlock(source, source.paid)
    if (block) return { status: "blocked", reason: block }
    if (source.payment_role === null) return { status: "blocked", reason: "unknown_payment" }
    // a card order (Balázs, 2026-10-06 05:31 UTC): A keeps its hold, B is paid through its own link
    if (source.payment_role === "ONLINE_CARD" && source.payment_state !== "hold") {
      return { status: "blocked", reason: "card_not_held" }
    }
    const plan = planSplit(source, input.lines)
    if (plan.status === "invalid") return plan
    // before A changes: B must be able to hold what moves (2026-10-06, #52)
    const plannedMoves = plan.moved.map((line) => ({
      ...line,
      location_id: source.reservation_locations[line.from_item_id] ?? null,
      allow_backorder: source.reservations.some((r) => r.line_item_id === line.from_item_id && r.allow_backorder),
    }))
    const stock = await ops.stockProblem(source, plannedMoves)
    if (stock) return { status: "invalid", message: stock }
    record = {
      order_id: null,
      moved: plannedMoves,
      remaining: plan.remaining,
      done: false,
    }
    await ops.setMetadata(source.id, withRecord(source.metadata, requestId, record))
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
      await ops.setMetadata(source.id, withRecord(afterEdit.metadata, requestId, record))
    }

    const fresh = (await ops.loadOrder(source.id))!
    const linked = Array.isArray(fresh.metadata?.[SPLIT_ORDER_IDS_KEY]) ? (fresh.metadata![SPLIT_ORDER_IDS_KEY] as string[]) : []
    record = { ...record, done: true }
    await ops.setMetadata(source.id, {
      ...withRecord(fresh.metadata, requestId, record),
      [SPLIT_ORDER_IDS_KEY]: linked.includes(record.order_id!) ? linked : [...linked, record.order_id!],
    })
    await ops.startBusinessStatus(record.order_id!)
    await ops.notifySplit(source.id, record.order_id!, paymentOf(source))
  }

  const [parent, created] = await Promise.all([ops.orderSummary(source.id), ops.orderSummary(record.order_id!)])
  return {
    status: "done",
    order_id: record.order_id!,
    display_id: created!.display_id,
    parent_order_id: source.id,
    parent_total: parent!.total,
    total: created!.total,
    payment_state: source.payment_role === "ONLINE_CARD" ? "awaiting_payment" : "none",
    resumed,
  }
}
