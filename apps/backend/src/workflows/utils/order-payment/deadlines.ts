import type { ReleaseSide } from "./release-hold"
import {
  ORDER_PAYMENT_METADATA_KEY,
  type StoredOrderPayment,
  storedOrderPaymentOf,
} from "./state"
import { PARENT_ORDER_METADATA_KEY } from "../split-completion"

/**
 * THE LINK'S DEADLINES (brief, point 6; acrobot 26483, decision 2): an
 * hourly job looks at the orders whose payment link is out.
 *
 *   3 days unpaid   the reminder mail, the state `reminded` (once per link)
 *   6 days unpaid   the link expires (`expired`)
 *
 * AT EXPIRY THE TWO KINDS PART:
 * - a released hold (L1/L2): the order is closed, "Sikertelenül lezárt", by
 *   the system with source `payment_deadline` (the brief: "ha akkor sem,
 *   Sikertelenül lezárt"). A mixed cart's pair is closed together.
 * - a difference over a hold that stays (plan section 5): only the LINK
 *   expires. The order keeps its hold and still waits for the difference
 *   (Kiszállítás refused); the shop sends a new link or edits the item out.
 *   Closing it would drop an order the customer already paid most of by hold,
 *   and that was not decided.
 */
export const REMIND_AFTER_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export type DeadlineStep = "remind" | "expire" | null

export const deadlineStep = (stored: StoredOrderPayment | null, now: Date): DeadlineStep => {
  const link = stored?.link
  if (!stored || !link || (stored.state !== "link_sent" && stored.state !== "reminded")) return null
  if (now.getTime() >= Date.parse(link.expires_at)) return "expire"
  if (
    stored.state === "link_sent" &&
    !link.reminded_at &&
    now.getTime() >= Date.parse(link.sent_at) + REMIND_AFTER_DAYS * DAY_MS
  ) {
    return "remind"
  }
  return null
}

export type DeadlineOperations = {
  /** Orders changed since `since`: a link sent or reminded writes the order, so every live one is among them. */
  candidates(since: Date): Promise<ReleaseSide[]>
  loadPair(orderId: string): Promise<{ primary: ReleaseSide; pickup: ReleaseSide | null } | null>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
  /** The reminder mail (`order-payment-reminder`), from the shipped order. */
  remind(input: {
    orderId: string
    pickupOrderId: string | null
    sentAt: string
    url: string
    expiresAt: string
    amount: number
  }): Promise<{ sent: boolean }>
  /** "Sikertelenül lezárt", by the system, for the payment deadline. */
  close(orderId: string): Promise<void>
  log(message: string): void
}

export type DeadlineReport = { reminded: string[]; expired: string[]; closed: string[]; failed: string[] }

/** How far back the job looks: the link's life with room for a job that did not run for a while. */
export const LOOK_BACK_DAYS = 14

const withState = (side: ReleaseSide, state: StoredOrderPayment) => ({
  ...(side.metadata ?? {}),
  [ORDER_PAYMENT_METADATA_KEY]: state,
})

export const runPaymentDeadlines = async (
  ops: DeadlineOperations,
  now: Date = new Date()
): Promise<DeadlineReport> => {
  const report: DeadlineReport = { reminded: [], expired: [], closed: [], failed: [] }
  const candidates = await ops.candidates(new Date(now.getTime() - LOOK_BACK_DAYS * DAY_MS))

  for (const candidate of candidates) {
    // a mixed cart's pickup half goes with its shipped order
    if (candidate.metadata?.[PARENT_ORDER_METADATA_KEY]) continue
    const step = deadlineStep(storedOrderPaymentOf(candidate.metadata), now)
    if (!step) continue

    try {
      const pair = await ops.loadPair(candidate.order_id)
      if (!pair) continue
      const stored = storedOrderPaymentOf(pair.primary.metadata)
      // read again: the customer may have paid since the list was taken
      if (deadlineStep(stored, now) !== step) continue
      const link = stored!.link!
      const sides = [pair.primary, ...(pair.pickup ? [pair.pickup] : [])]

      if (step === "remind") {
        // marked first: a failed mail is not sent again every hour
        const reminded = { ...link, reminded_at: now.toISOString() }
        for (const side of sides) {
          const own = storedOrderPaymentOf(side.metadata) ?? stored!
          await ops.setMetadata(side.order_id, withState(side, { ...own, state: "reminded", link: reminded }))
        }
        const mail = await ops.remind({
          orderId: pair.primary.order_id,
          pickupOrderId: pair.pickup?.order_id ?? null,
          sentAt: link.sent_at,
          url: link.url,
          expiresAt: link.expires_at,
          amount: link.amount,
        })
        if (!mail.sent) ops.log(`Order ${pair.primary.order_id}: the payment reminder did not go`)
        report.reminded.push(pair.primary.order_id)
        continue
      }

      // expired: the link no longer pays, whatever happens next
      for (const side of sides) {
        const own = storedOrderPaymentOf(side.metadata) ?? stored!
        await ops.setMetadata(side.order_id, withState(side, { ...own, state: "expired" }))
      }
      report.expired.push(pair.primary.order_id)
      if (stored!.kind === "difference") continue

      for (const side of sides) {
        await ops.close(side.order_id)
        report.closed.push(side.order_id)
      }
    } catch (error) {
      report.failed.push(candidate.order_id)
      ops.log(
        `Order ${candidate.order_id}: the payment deadline step "${step}" failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return report
}
