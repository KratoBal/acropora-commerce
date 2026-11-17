import { MedusaError } from "@medusajs/framework/utils"

import { STRIPE_PROVIDER_ID } from "../stripe-config"
import type { OrderReadout, PaymentReadout } from "./readout"

/**
 * THE PURE PART OF THE TEST-REFUND MEASUREMENT (commerce card 04b6010e, acrobot 54480): reading the input a one-off container task
 * carries, and deciding whether a refund may be booked. The script `src/scripts/book-test-refund.ts` is only the glue around it.
 *
 * WHY IT EXISTS: #617 prints the live shape of an order's payment figures, but a refund has to be BOOKED on a test order first, or
 * the `refunds` field is always empty and there is nothing to read. That used to be two person steps (the Medusa admin refund and a
 * look at the Stripe dashboard). The refund now goes through the same workflow the admin route runs, from inside the container,
 * and the Stripe side is read with the test key over its API.
 *
 * THE INPUT TRAVELS IN THE COMMAND, as base64 JSON after `--input`: the environment of a Coolify task does not reach the run
 * (measured 2026-11-14), the command line does.
 */
export type MeasureInput =
  | { mode: "list"; limit: number }
  | {
      mode: "plan" | "apply"
      order_id: string
      /** a whole amount in the order's currency (forints), at least 1 */
      amount: number
      payment_id: string | null
      note: string
      /** `apply` books nothing unless this repeats the order id */
      confirm_order_id: string | null
    }

const MODES = ["list", "plan", "apply"] as const

/** The value after `--input` (`--input <b64>` or `--input=<b64>`), or null. */
export const inputArgument = (args: readonly string[]): string | null => {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--input") return args[i + 1] ?? null
    if (arg.startsWith("--input=")) return arg.slice("--input=".length)
  }
  return null
}

/** Decodes and validates the input. Throws a MedusaError (INVALID_DATA) that names what is wrong (never echoes the whole input back). */
export const decodeInput = (args: readonly string[]): MeasureInput => {
  const raw = inputArgument(args)
  if (!raw) throw new MedusaError(MedusaError.Types.INVALID_DATA, "no --input <base64 of a JSON object> in the command")
  let json: unknown
  try {
    json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
  } catch {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "--input is not base64 of valid JSON")
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "--input must be a JSON object")
  const obj = json as Record<string, unknown>
  const mode = obj.mode ?? "plan"
  if (!MODES.includes(mode as (typeof MODES)[number])) throw new MedusaError(MedusaError.Types.INVALID_DATA, `mode must be one of ${MODES.join(", ")}`)
  if (mode === "list") {
    const limit = obj.limit === undefined ? 5 : obj.limit
    if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 20) throw new MedusaError(MedusaError.Types.INVALID_DATA, "limit must be a whole number from 1 to 20")
    return { mode: "list", limit }
  }
  const orderId = obj.order_id
  if (typeof orderId !== "string" || !/^order_[A-Za-z0-9]+$/.test(orderId)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "order_id must look like order_01...")
  const amount = obj.amount
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) throw new MedusaError(MedusaError.Types.INVALID_DATA, "amount must be a whole number of at least 1 (forints)")
  const paymentId = obj.payment_id ?? null
  if (paymentId !== null && (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId))) throw new MedusaError(MedusaError.Types.INVALID_DATA, "payment_id must look like pay_01...")
  const note = obj.note === undefined ? "measurement (card 04b6010e)" : obj.note
  if (typeof note !== "string" || note.length < 1 || note.length > 200) throw new MedusaError(MedusaError.Types.INVALID_DATA, "note must be 1 to 200 characters")
  const confirm = obj.confirm_order_id ?? null
  if (confirm !== null && typeof confirm !== "string") throw new MedusaError(MedusaError.Types.INVALID_DATA, "confirm_order_id must be a string")
  return { mode: mode as "plan" | "apply", order_id: orderId, amount, payment_id: paymentId, note, confirm_order_id: confirm }
}

/** Only a Stripe TEST secret key may be used; a live key (`sk_live_`, `rk_live_`) or anything else refuses. */
export const isStripeTestKey = (key: string | undefined | null): boolean => typeof key === "string" && /^sk_test_[A-Za-z0-9]+$/.test(key.trim())

export type RefundPlan = {
  ok: boolean
  problems: string[]
  payment_id: string | null
  /** what is still refundable on the chosen payment: captured minus refunded */
  refundable: number | null
}

const stripePayments = (readout: OrderReadout): PaymentReadout[] =>
  readout.collections.flatMap((c) => c.payments).filter((p) => p.provider_id === STRIPE_PROVIDER_ID && !p.canceled)

/**
 * MAY THIS REFUND BE BOOKED? Every reason against it is named; `ok` only when there is none. Nothing here writes.
 * `testKey` and `intentLive` come from the glue: the key's shape, and Stripe's own `livemode` of the payment's intent (null: not read).
 */
export const planRefund = (input: {
  readout: OrderReadout
  amount: number
  paymentId: string | null
  testKey: boolean
  intentLive: boolean | null
}): RefundPlan => {
  const problems: string[] = []
  if (!input.testKey) problems.push("STRIPE_API_KEY is not a Stripe TEST key (sk_test_...): refusing, whatever else is true")
  if (input.intentLive === true) problems.push("Stripe says the payment's intent is LIVE mode: refusing")
  let candidates = stripePayments(input.readout)
  if (input.paymentId) candidates = candidates.filter((p) => p.id === input.paymentId)
  if (candidates.length === 0) {
    problems.push(input.paymentId ? `no Stripe payment ${input.paymentId} on this order` : "the order has no Stripe payment that is not canceled")
    return { ok: false, problems, payment_id: null, refundable: null }
  }
  if (candidates.length > 1) {
    problems.push(`the order has ${candidates.length} Stripe payments (${candidates.map((p) => p.id).join(", ")}): name one as payment_id`)
    return { ok: false, problems, payment_id: null, refundable: null }
  }
  const payment = candidates[0]
  const captured = payment.captured_total
  const refunded = payment.refunded_total
  if (!Number.isFinite(captured) || !Number.isFinite(refunded)) {
    problems.push("a capture or refund amount of this payment is not a finite number: what is refundable cannot be computed (read it with measure-order-payments first)")
    return { ok: false, problems, payment_id: payment.id, refundable: null }
  }
  const refundable = captured - refunded
  if (captured <= 0) problems.push("nothing is captured on this payment, so there is nothing to refund")
  if (input.amount > refundable) problems.push(`amount ${input.amount} is more than what is refundable (${refundable} = captured ${captured} minus refunded ${refunded})`)
  return { ok: problems.length === 0, problems, payment_id: payment.id, refundable }
}

/**
 * MAY `apply` BOOK ANYTHING? The reason it may not, or null. Two gates, both named: the confirmation must repeat the order id (a
 * plan copied into an apply by hand is not enough), and the plan must have found nothing against it.
 */
export const applyRefusal = (input: MeasureInput, plan: RefundPlan): string | null => {
  if (input.mode !== "apply") return "the mode is not apply: nothing is booked"
  if (input.confirm_order_id !== input.order_id) return "apply needs confirm_order_id equal to order_id: nothing booked"
  if (!plan.ok || !plan.payment_id) return `refused: ${plan.problems.join("; ")}`
  return null
}
