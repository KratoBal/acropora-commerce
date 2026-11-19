import { Context } from "@medusajs/framework/types"
import {
  generateEntityId,
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import { giftCardCodeHash, newGiftCardCode, normalizeGiftCardCode } from "./code"
import GiftCard from "./models/gift-card"
import GiftCardTransaction from "./models/gift-card-transaction"

export type GiftCardIssue = {
  /** Whole units of the currency (forint), at least 1. */
  amount: number
  currency_code?: string
  expires_at?: Date | null
  recipient_email?: string | null
  note?: string | null
  issued_by?: string | null
}

export type GiftCardMovement = {
  gift_card_id: string
  /** Whole units, positive: the direction is the method's. */
  amount: number
  /** The cart the redemption completed; a refund names the same cart. */
  reference: string
}

type Knex = {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

/**
 * GIFT CARDS (card 495c0007): issue, look up by code, redeem at a cart's completion, refund to it, disable.
 *
 * A BALANCE ONLY MOVES IN ONE SQL STATEMENT, with its ledger row, in the caller's transaction:
 * `balance = balance - amount ... where balance >= amount and active and not expired`. Two checkouts spending one
 * card cannot both pass, and no ORM entity holds a stale balance to flush back (#811: the ORM wrote an insert before
 * an update in one transaction). A redeem or refund repeated for the same cart finds its ledger row and does
 * nothing a second time.
 */
class GiftCardModuleService extends MedusaService({ GiftCard, GiftCardTransaction }) {
  /** Issues a card; the answer is the ONLY place its full code appears. */
  @InjectManager()
  async issueGiftCard(input: GiftCardIssue, @MedusaContext() sharedContext: Context = {}) {
    return await this.issueGiftCard_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async issueGiftCard_(input: GiftCardIssue, @MedusaContext() sharedContext: Context = {}) {
    if (!Number.isInteger(input.amount) || input.amount < 1)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "A gift card's amount is a whole number, at least 1.")
    const code = newGiftCardCode()
    const normalized = normalizeGiftCardCode(code)!
    const giftCard = await this.createGiftCards(
      {
        code_hash: giftCardCodeHash(normalized),
        code_last4: normalized.slice(-4),
        currency_code: input.currency_code ?? "huf",
        initial_amount: input.amount,
        balance: input.amount,
        status: "active",
        expires_at: input.expires_at ?? null,
        recipient_email: input.recipient_email ?? null,
        note: input.note ?? null,
        issued_by: input.issued_by ?? null,
      },
      sharedContext
    )
    await this.createGiftCardTransactions(
      {
        gift_card_id: giftCard.id,
        kind: "issue",
        amount: input.amount,
        balance_after: input.amount,
        reference: null,
        note: input.note ?? null,
      },
      sharedContext
    )
    return { gift_card: giftCard, code }
  }

  /** The card a typed code names, or null (a malformed code is null too: no hint which). */
  @InjectManager()
  async retrieveGiftCardByCode(code: string, @MedusaContext() sharedContext: Context = {}) {
    const normalized = normalizeGiftCardCode(code)
    if (!normalized) return null
    const [card] = await this.listGiftCards({ code_hash: giftCardCodeHash(normalized) }, { take: 1 }, sharedContext)
    return card ?? null
  }

  /** Takes `amount` off the card for the cart being completed; refused when the card cannot pay it. Once per card and cart. */
  @InjectManager()
  async redeemGiftCard(input: GiftCardMovement, @MedusaContext() sharedContext: Context = {}) {
    return await this.moveBalance_("redeem", input, sharedContext)
  }

  /** Puts `amount` back on the card for that cart's order (a return, a cancellation). Once per card and cart. */
  @InjectManager()
  async refundGiftCard(input: GiftCardMovement, @MedusaContext() sharedContext: Context = {}) {
    return await this.moveBalance_("refund", input, sharedContext)
  }

  @InjectTransactionManager()
  protected async moveBalance_(
    kind: "redeem" | "refund",
    input: GiftCardMovement,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ balance: number; repeated: boolean }> {
    if (!Number.isInteger(input.amount) || input.amount < 1)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "A gift card movement is a whole number, at least 1.")
    const knex = (
      sharedContext.transactionManager as { getTransactionContext(): Knex | undefined } | undefined
    )?.getTransactionContext()
    if (!knex)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A gift card balance moves only inside a transaction."
      )
    const done = await knex.raw(
      `select balance_after from gift_card_transaction where gift_card_id = ? and kind = ? and reference = ? and deleted_at is null`,
      [input.gift_card_id, kind, input.reference]
    )
    if (done.rows.length) return { balance: Number(done.rows[0]!.balance_after), repeated: true }
    const updated =
      kind === "redeem"
        ? await knex.raw(
            `update gift_card set balance = balance - ?, updated_at = now()
             where id = ? and deleted_at is null and status = 'active' and balance >= ?
               and (expires_at is null or expires_at > now())
             returning balance`,
            [input.amount, input.gift_card_id, input.amount]
          )
        : await knex.raw(
            `update gift_card set balance = balance + ?, updated_at = now()
             where id = ? and deleted_at is null
             returning balance`,
            [input.amount, input.gift_card_id]
          )
    if (!updated.rows.length)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        kind === "redeem"
          ? "Az ajándékkártya nem fedezi ezt az összeget, nem aktív, vagy lejárt."
          : "Nincs ilyen ajándékkártya."
      )
    const balance = Number(updated.rows[0]!.balance)
    await knex.raw(
      `insert into gift_card_transaction (id, gift_card_id, kind, amount, balance_after, reference, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, now(), now())`,
      [
        generateEntityId(undefined, "gctx"),
        input.gift_card_id,
        kind,
        kind === "redeem" ? -input.amount : input.amount,
        balance,
        input.reference,
      ]
    )
    return { balance, repeated: false }
  }

  /** A disabled card cannot pay; its balance and ledger stay. */
  @InjectManager()
  async disableGiftCard(id: string, @MedusaContext() sharedContext: Context = {}) {
    return await this.updateGiftCards({ id, status: "disabled" }, sharedContext)
  }
}

export default GiftCardModuleService
