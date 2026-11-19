import type { Context } from "@medusajs/framework/types"
import {
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
   * transaction does not lock the customer, so two debits sent at the same instant can each pass the check and
   * together overdraw. Manual debits are rare and made by a person; an overdrawn balance shows as negative, and the
   * later redemption path refuses a customer who has no points. A row lock would close it, and it was not measured.
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
      const rows = (await this.listLoyaltyEntries({ customer_id: input.customer_id }, { take: null }, sharedContext)) as LoyaltyEntryRow[]
      const balance = sumPoints(rows)
      if (balance + input.points < 0) return { status: "overdraw", balance }
    }
    const entry = (await this.createLoyaltyEntries(
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
    return { status: "ok", entry }
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

  /** The module's rows and the lock, as the rules see them, inside the caller's transaction. */
  private txOf(sharedContext: Context): LedgerTx {
    const knex = (
      sharedContext.transactionManager as
        | { getTransactionContext(): { raw(sql: string, bindings: unknown[]): Promise<unknown> } | undefined }
        | undefined
    )?.getTransactionContext()
    if (!knex)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The points ledger moves only inside a transaction.")
    return {
      lock: async (customerId) => {
        await knex.raw("select pg_advisory_xact_lock(hashtext(?))", [`loyalty:${customerId}`])
      },
      rows: async (customerId) =>
        (await this.listLoyaltyEntries({ customer_id: customerId }, { take: null }, sharedContext)) as LoyaltyEntryRow[],
      byReference: async (reference) => {
        const [row] = (await this.listLoyaltyEntries({ reference }, { take: 1 }, sharedContext)) as LoyaltyEntryRow[]
        return row ?? null
      },
      create: async (input) =>
        (await this.createLoyaltyEntries(
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
        )) as LoyaltyEntryRow,
      remove: async (id) => {
        await this.softDeleteLoyaltyEntries(id, {}, sharedContext)
      },
    }
  }
}

export default LoyaltyModuleService
