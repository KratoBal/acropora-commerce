import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { LOYALTY_MODULE } from "../../../modules/loyalty"
import type LoyaltyModuleService from "../../../modules/loyalty/service"
import type { LoyaltyEntryRow, NewLoyaltyEntry } from "../../../modules/loyalty/service"

/**
 * THE LOYALTY LEDGER'S READ AND MANUAL ADJUSTMENT (card dfb79916, first PR: no cart, no accrual yet). The rules sit here
 * against injected operations, so they are measured without a database or a running Medusa; `loyaltyOperations` is the
 * one place that binds them to the module and the customer module.
 */
export type LoyaltyOperations = {
  customerExists(customerId: string): Promise<boolean>
  balanceOf(customerId: string): Promise<number>
  /** The newest rows first, at most `limit`. */
  recent(customerId: string, limit: number): Promise<LoyaltyEntryRow[]>
  findByReference(reference: string): Promise<LoyaltyEntryRow | null>
  addEntryChecked(
    input: NewLoyaltyEntry,
  ): Promise<{ status: "ok"; entry: LoyaltyEntryRow } | { status: "overdraw"; balance: number }>
}

export type AdjustmentInput = {
  customer_id: string
  /** whole points, signed and never zero: the validator holds this, the module's check backs it */
  points: number
  reason: string
  /** the caller's key for this movement: the same key sent twice stores one row */
  reference?: string
}

export type AdjustmentResult =
  | { status: "created"; entry: LoyaltyEntryRow; balance: number }
  | { status: "replayed"; entry: LoyaltyEntryRow; balance: number }
  | { status: "customer_not_found" }
  | { status: "overdraw"; balance: number }
  | { status: "reference_conflict" }

/** A stored row as the OS reads it: everything the ledger keeps. */
export type AdminEntryView = {
  id: string
  kind: string
  points: number
  order_id: string | null
  reference: string | null
  reason: string
  actor: string
  created_at: string
}

/** A stored row as the CUSTOMER reads it: no reason and no actor (a manual credit's reason is an internal note). */
export type StoreEntryView = { id: string; kind: string; points: number; order_id: string | null; created_at: string }

const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString())

export const adminEntryView = (row: LoyaltyEntryRow): AdminEntryView => ({
  id: row.id,
  kind: row.kind,
  points: row.points,
  order_id: row.order_id,
  reference: row.reference,
  reason: row.reason,
  actor: row.actor,
  created_at: iso(row.created_at),
})

export const storeEntryView = (row: LoyaltyEntryRow): StoreEntryView => ({
  id: row.id,
  kind: row.kind,
  points: row.points,
  order_id: row.order_id,
  created_at: iso(row.created_at),
})

/** The same movement: the same customer, the same points. Anything else under a used key is a conflict, not a replay. */
const sameMovement = (row: LoyaltyEntryRow, input: AdjustmentInput): boolean =>
  row.customer_id === input.customer_id && row.points === input.points && row.kind === "adjustment"

/**
 * ONE MANUAL CREDIT OR DEBIT. Order of the checks matters: the customer must exist (a typo in an id must not open a
 * ledger for nobody); a key already used answers the stored row (a replay) or a conflict; only then is a debit measured
 * against the balance, in the module's one transaction. A lost race on the key (two identical requests at once: the
 * unique index refuses the second) is read again and answered as the replay it is.
 */
export const adjustLoyalty = async (
  ops: LoyaltyOperations,
  input: AdjustmentInput,
  actor: string,
): Promise<AdjustmentResult> => {
  if (!(await ops.customerExists(input.customer_id))) return { status: "customer_not_found" }

  if (input.reference) {
    const used = await ops.findByReference(input.reference)
    if (used) {
      if (!sameMovement(used, input)) return { status: "reference_conflict" }
      return { status: "replayed", entry: used, balance: await ops.balanceOf(input.customer_id) }
    }
  }

  let outcome: Awaited<ReturnType<LoyaltyOperations["addEntryChecked"]>>
  try {
    outcome = await ops.addEntryChecked({
      customer_id: input.customer_id,
      kind: "adjustment",
      points: input.points,
      reference: input.reference ?? null,
      reason: input.reason,
      actor,
    })
  } catch (error) {
    // the unique index on the key refused a row a racing request stored first: answer that one, or rethrow
    if (input.reference) {
      const winner = await ops.findByReference(input.reference)
      if (winner) {
        if (!sameMovement(winner, input)) return { status: "reference_conflict" }
        return { status: "replayed", entry: winner, balance: await ops.balanceOf(input.customer_id) }
      }
    }
    throw error
  }

  if (outcome.status === "overdraw") return { status: "overdraw", balance: outcome.balance }
  return { status: "created", entry: outcome.entry, balance: await ops.balanceOf(input.customer_id) }
}

export type LoyaltyReadResult = { status: "ok"; balance: number; entries: LoyaltyEntryRow[] } | { status: "customer_not_found" }

/** The balance and the newest rows. The admin read asks first whether the customer exists; the store read has the session's id. */
export const readLoyalty = async (
  ops: LoyaltyOperations,
  customerId: string,
  options: { limit: number; checkCustomer: boolean },
): Promise<LoyaltyReadResult> => {
  if (options.checkCustomer && !(await ops.customerExists(customerId))) return { status: "customer_not_found" }
  const [balance, entries] = await Promise.all([ops.balanceOf(customerId), ops.recent(customerId, options.limit)])
  return { status: "ok", balance, entries }
}

/** The newest first; the id breaks a tie, so two rows stored in the same instant always come in the same order. */
export const RECENT_ORDER = { created_at: "DESC", id: "DESC" } as const

/** The binding to the module and the customer module: the only code here that touches the container. */
export const loyaltyOperations = (scope: MedusaContainer): LoyaltyOperations => {
  const loyalty = (): LoyaltyModuleService => scope.resolve(LOYALTY_MODULE)
  return {
    async customerExists(customerId) {
      const customerModule = scope.resolve(Modules.CUSTOMER) as {
        listCustomers(filters: { id: string }, config: { take: number; select: string[] }): Promise<{ id: string }[]>
      }
      return (await customerModule.listCustomers({ id: customerId }, { take: 1, select: ["id"] })).length > 0
    },
    balanceOf: (customerId) => loyalty().balanceOf(customerId),
    async recent(customerId, limit) {
      return (await loyalty().listLoyaltyEntries(
        { customer_id: customerId },
        { take: limit, order: { ...RECENT_ORDER } },
      )) as LoyaltyEntryRow[]
    },
    async findByReference(reference) {
      const [row] = (await loyalty().listLoyaltyEntries({ reference }, { take: 1 })) as LoyaltyEntryRow[]
      return row ?? null
    },
    addEntryChecked: (input) => loyalty().addEntryChecked(input),
  }
}
