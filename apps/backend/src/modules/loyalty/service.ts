import type { Context } from "@medusajs/framework/types"
import { InjectManager, InjectTransactionManager, MedusaContext, MedusaService } from "@medusajs/framework/utils"

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
}

export default LoyaltyModuleService
