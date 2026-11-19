import type { Context } from "@medusajs/framework/types"
import {
  generateEntityId,
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import { redeemRule, reverseRule, voidRule, type LedgerTx } from "../../workflows/utils/loyalty/ledger-rules"
import { sumPoints } from "./balance"
import LoyaltyEntry from "./models/loyalty-entry"
import type { LoyaltyKind } from "./types"

export type LoyaltyEntryRow = {
  id: string
  customer_id: string
  kind: string
  points: number
  order_id: string | null
  reference: string | null
  reason: string
  actor: string
  created_at: Date | string
}

export type NewLoyaltyEntry = {
  customer_id: string
  kind: LoyaltyKind
  points: number
  order_id?: string | null
  reference?: string | null
  reason: string
  actor: string
}

class LoyaltyModuleService extends MedusaService({ LoyaltyEntry }) {
  /** The customer's balance: the sum of every row (there is no balance column to drift). */
  @InjectManager()
  async balanceOf(customerId: string, @MedusaContext() sharedContext: Context = {}): Promise<number> {
    const rows = (await this.listLoyaltyEntries({ customer_id: customerId }, { take: null }, sharedContext)) as LoyaltyEntryRow[]
    return sumPoints(rows)
  }

  /**
   * THE BALANCE CHECK AND THE ROW IN ONE TRANSACTION. A debit that would take the balance below zero is refused
   * (`overdraw`), and the answer carries the balance it was measured against. KNOWN LIMIT, NOT CLOSED HERE: the
   * debit takes the customer's advisory lock first (the cart-time movements take the same one), so a manual debit and a
   * checkout redemption cannot together overdraw.
   */
  @InjectManager()
  async addEntryChecked(
    input: NewLoyaltyEntry,
    @MedusaContext() sharedContext: Context = {},
  ): Promise<{ status: "ok"; entry: LoyaltyEntryRow } | { status: "overdraw"; balance: number }> {
    return await this.addEntryChecked_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async addEntryChecked_(
    input: NewLoyaltyEntry,
    @MedusaContext() sharedContext: Context = {},
  ): Promise<{ status: "ok"; entry: LoyaltyEntryRow } | { status: "overdraw"; balance: number }> {
    if (input.points < 0) {
      // THE CUSTOMER'S LOCK, the one the cart-time movements take (barracuda, #808 B): a manual debit and a checkout
      // redemption sent at the same instant would each pass the balance check and together go below zero, and a point
      // is a forint. Same key, same advisory lock, held to the end of the transaction.
      await this.lockCustomer(sharedContext, input.customer_id)
      const rows = (await this.listLoyaltyEntries({ customer_id: input.customer_id }, { take: null }, sharedContext)) as LoyaltyEntryRow[]
      const balance = sumPoints(rows)
      if (balance + input.points < 0) return { status: "overdraw", balance }
    }
    const created = (await this.createLoyaltyEntries(
      {
        customer_id: input.customer_id,
        kind: input.kind,
        points: input.points,
        order_id: input.order_id ?? null,
        reference: input.reference ?? null,
        reason: input.reason,
        actor: input.actor,
      },
      sharedContext,
    )) as LoyaltyEntryRow
    /*
      READ BACK, IN THIS TRANSACTION (2026-11-19, measured on a real Postgres): the create answers only the fields it was
      given, without `created_at`, so the admin route's view of the new row threw "Invalid time value" AFTER the write and
      every manual credit and debit answered 500 while it was stored. The stored row is the answer.
    */
    const [entry] = (await this.listLoyaltyEntries({ id: created.id }, { take: 1 }, sharedContext)) as LoyaltyEntryRow[]
    return { status: "ok", entry: entry ?? created }
  }

  /**
   * The ledger's three cart-time movements. Each runs the rules of `ledger-rules.ts` inside the caller's transaction, with
   * the customer serialized by an advisory lock (there is no balance row to lock, so the lock is on the customer's key).
   */
  @InjectManager()
  async redeemPoints(
    input: { customer_id: string; points: number; cart_id: string },
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await this.redeemPoints_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async redeemPoints_(
    input: { customer_id: string; points: number; cart_id: string },
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await redeemRule(this.txOf(sharedContext), input)
  }

  @InjectManager()
  async voidPointsRedemption(input: { customer_id: string; cart_id: string }, @MedusaContext() sharedContext: Context = {}) {
    return await this.voidPointsRedemption_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async voidPointsRedemption_(
    input: { customer_id: string; cart_id: string },
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await voidRule(this.txOf(sharedContext), input)
  }

  @InjectManager()
  async reversePointsRedemption(
    input: { customer_id: string; cart_id: string; order_id: string },
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await this.reversePointsRedemption_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async reversePointsRedemption_(
    input: { customer_id: string; cart_id: string; order_id: string },
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await reverseRule(this.txOf(sharedContext), input)
  }

  /** The transaction's connection, or a refusal: the ledger moves only inside one. */
  private knexOf(sharedContext: Context): { raw(sql: string, bindings: unknown[]): Promise<{ rows: unknown[] }> } {
    const knex = (
      sharedContext.transactionManager as
        | { getTransactionContext(): { raw(sql: string, bindings: unknown[]): Promise<{ rows: unknown[] }> } | undefined }
        | undefined
    )?.getTransactionContext()
    if (!knex)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The points ledger moves only inside a transaction.")
    return knex
  }

  /** Serializes one customer's movements for the rest of the transaction (there is no balance row to lock). */
  private async lockCustomer(sharedContext: Context, customerId: string): Promise<void> {
    await this.knexOf(sharedContext).raw("select pg_advisory_xact_lock(hashtext(?))", [`loyalty:${customerId}`])
  }

  /**
   * The module's rows and the lock, as the rules see them, inside the caller's transaction.
   *
   * THE WRITES ARE RAW SQL ON THE TRANSACTION'S CONNECTION, IN THE RULES' ORDER (barracuda, #808 A, the trap of #804): the
   * redemption of other points for the same cart soft-deletes the row and creates the next one under the SAME reference,
   * against the partial unique index. The ORM puts an insert before an update in one unit of work, which on a real
   * database refused every such save; the gift card service writes raw for the same reason. Two statements, one after the
   * other, in the order written. The reads stay on the module (they query the database each time, in this transaction).
   */
  private txOf(sharedContext: Context): LedgerTx {
    const knex = this.knexOf(sharedContext)
    return {
      lock: (customerId) => this.lockCustomer(sharedContext, customerId),
      rows: async (customerId) =>
        (await this.listLoyaltyEntries({ customer_id: customerId }, { take: null }, sharedContext)) as LoyaltyEntryRow[],
      byReference: async (reference) => {
        const [row] = (await this.listLoyaltyEntries({ reference }, { take: 1 }, sharedContext)) as LoyaltyEntryRow[]
        return row ?? null
      },
      create: async (input) => {
        const id = generateEntityId(undefined, "loyent")
        const result = await knex.raw(
          `insert into loyalty_entry (id, customer_id, kind, points, order_id, reference, reason, actor, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, now(), now())
           returning id, customer_id, kind, points, order_id, reference, reason, actor, created_at`,
          [
            id,
            input.customer_id,
            input.kind,
            input.points,
            input.order_id ?? null,
            input.reference ?? null,
            input.reason,
            input.actor,
          ],
        )
        return result.rows[0] as LoyaltyEntryRow
      },
      remove: async (id) => {
        await knex.raw(`update loyalty_entry set deleted_at = now(), updated_at = now() where id = ? and deleted_at is null`, [id])
      },
    }
  }
}

export default LoyaltyModuleService
