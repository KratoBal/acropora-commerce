import { MedusaError } from "@medusajs/framework/utils"

import type { StripeReader } from "./reader"

/**
 * THE SETTLEMENT FEED THE OS READS (A9, card 6339b04c): Stripe's payouts, and for each payout the balance transactions
 * it paid out, with the amount, the fee and the net, and the PaymentIntent the OS pairs to an order.
 *
 * Read from the installed SDK's typings (stripe 15.12.0) and not assumed:
 * - `balance_transactions` list: `payout` = "for automatic Stripe payouts only, only returns transactions that were paid
 *   out on the specified payout ID"; `type`, `created`, `expand`, `limit`, `starting_after` exist;
 * - `BalanceTransaction.source` is a string id, or the expanded object (`data.source`); a Charge and a Refund both carry
 *   `payment_intent`, a Refund also `charge`;
 * - `Payout`: `id, amount, currency, status, arrival_date, created, automatic, type, method`.
 * Whether the LIST accepts `expand[]=data.source` is the one thing the typings only imply; it is measured on the test
 * backend before the OS builds on it.
 *
 * WHAT IT NEVER CARRIES: a name, an address, an e-mail, a card, a description (Stripe fills it with the customer's
 * statement text), the metadata of a charge. Only the ids and the figures the pairing needs.
 *
 * AMOUNTS come in Stripe's smallest unit (HUF is two-decimal there: 1 000 Ft is 100 000). Both are returned: `*_minor`
 * exactly as Stripe sent it, and the major unit the OS books.
 */
const ZERO_DECIMAL = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]
const THREE_DECIMAL = ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]

export const majorUnit = (minor: number, currency: string): number => {
  const code = currency.toUpperCase()
  const power = ZERO_DECIMAL.includes(code) ? 0 : THREE_DECIMAL.includes(code) ? 3 : 2
  return Math.round(minor) / Math.pow(10, power)
}

const idOf = (value: unknown): string | null => {
  if (typeof value === "string" && value) return value
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return (value as { id: string }).id
  return null
}

export type PayoutView = {
  id: string
  status: string
  currency: string
  amount_minor: number
  amount: number
  arrival_date: number
  created: number
  automatic: boolean
  type: string | null
  method: string | null
}

export type TransactionView = {
  id: string
  type: string
  reporting_category: string | null
  created: number
  available_on: number | null
  currency: string
  amount_minor: number
  fee_minor: number
  net_minor: number
  amount: number
  fee: number
  net: number
  status: string | null
  /** What the balance transaction came from: `charge`, `refund`, `payout`... or null when Stripe sent only an id. */
  source_kind: string | null
  source_id: string | null
  payment_intent: string | null
  charge: string | null
  refund: string | null
}

export const payoutView = (payout: any): PayoutView => {
  const currency = String(payout.currency ?? "").toLowerCase()
  return {
    id: String(payout.id),
    status: String(payout.status ?? ""),
    currency,
    amount_minor: Number(payout.amount),
    amount: majorUnit(Number(payout.amount), currency),
    arrival_date: Number(payout.arrival_date),
    created: Number(payout.created),
    automatic: payout.automatic === true,
    type: typeof payout.type === "string" ? payout.type : null,
    method: typeof payout.method === "string" ? payout.method : null,
  }
}

export const transactionView = (txn: any): TransactionView => {
  const currency = String(txn.currency ?? "").toLowerCase()
  const source = txn.source
  const expanded = source && typeof source === "object" ? source : null
  const kind: string | null = expanded && typeof expanded.object === "string" ? expanded.object : null
  const charge = kind === "charge" ? idOf(expanded) : kind === "refund" ? idOf(expanded.charge) : null
  return {
    id: String(txn.id),
    type: String(txn.type ?? ""),
    reporting_category: typeof txn.reporting_category === "string" ? txn.reporting_category : null,
    created: Number(txn.created),
    available_on: typeof txn.available_on === "number" ? txn.available_on : null,
    currency,
    amount_minor: Number(txn.amount),
    fee_minor: Number(txn.fee),
    net_minor: Number(txn.net),
    amount: majorUnit(Number(txn.amount), currency),
    fee: majorUnit(Number(txn.fee), currency),
    net: majorUnit(Number(txn.net), currency),
    status: typeof txn.status === "string" ? txn.status : null,
    source_kind: kind,
    source_id: idOf(source),
    payment_intent: kind === "charge" || kind === "refund" ? idOf(expanded.payment_intent) : null,
    charge,
    refund: kind === "refund" ? idOf(expanded) : null,
  }
}

/**
 * A Stripe answer that is not 200. The text is NOT passed on: Stripe's own message can quote part of the key
 * ("Invalid API Key provided: sk_test_****abcd"). The HTTP status, Stripe's error `type` and `code` are enough.
 */
const refusal = (what: string, response: { status: number; body: any }): MedusaError => {
  const error = response.body?.error ?? {}
  const detail = [error.type, error.code].filter((part) => typeof part === "string").join("/")
  const type =
    response.status === 404
      ? MedusaError.Types.NOT_FOUND
      : response.status === 400
        ? MedusaError.Types.INVALID_DATA
        : MedusaError.Types.UNEXPECTED_STATE
  return new MedusaError(type, `stripe ${what} answered HTTP ${response.status}${detail ? ` (${detail})` : ""}`)
}

export type Page<T> = { has_more: boolean; next_cursor: string | null } & T

export const listPayouts = async (
  read: StripeReader,
  input: { createdGte?: number; status?: string; startingAfter?: string; limit: number },
): Promise<Page<{ payouts: PayoutView[] }>> => {
  const response = await read("payouts", {
    limit: input.limit,
    ...(input.createdGte !== undefined ? { created: { gte: input.createdGte } } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.startingAfter ? { starting_after: input.startingAfter } : {}),
  })
  if (response.status !== 200) throw refusal("payouts", response)
  const data: any[] = Array.isArray(response.body?.data) ? response.body.data : []
  return {
    payouts: data.map(payoutView),
    has_more: response.body?.has_more === true,
    next_cursor: data.length ? String(data[data.length - 1].id) : null,
  }
}

export const listPayoutTransactions = async (
  read: StripeReader,
  input: { payoutId: string; startingAfter?: string; limit: number },
): Promise<Page<{ transactions: TransactionView[] }>> => {
  const response = await read("balance_transactions", {
    payout: input.payoutId,
    limit: input.limit,
    expand: ["data.source"],
    ...(input.startingAfter ? { starting_after: input.startingAfter } : {}),
  })
  if (response.status !== 200) throw refusal("balance_transactions", response)
  const data: any[] = Array.isArray(response.body?.data) ? response.body.data : []
  return {
    transactions: data.map(transactionView),
    has_more: response.body?.has_more === true,
    next_cursor: data.length ? String(data[data.length - 1].id) : null,
  }
}
