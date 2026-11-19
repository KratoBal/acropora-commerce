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

export type GiftCardRefund = GiftCardMovement & {
  /** The refund event's own key (a return id, a cancellation): the same event repeated refunds once. */
  key: string
}

const wholePositive = (amount: number) => {
  if (!Number.isInteger(amount) || amount < 1)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A gift card movement is a whole number, at least 1.")
}

type Knex = {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

/**
 * GIFT CARDS (card 495c0007): issue, look up by code, redeem at a cart's completion, refund to it, disable.
 *
 * A BALANCE ONLY MOVES IN ONE SQL STATEMENT, with its ledger row, in the caller's transaction:
 * `balance = balance - amount ... where balance >= amount and active and not expired`, after the card's row is
 * locked. Two checkouts spending one card cannot both pass, and no ORM entity holds a stale balance to flush back
 * (#811: the ORM wrote an insert before an update in one transaction). A redeem repeated for the same cart, or a
 * refund repeated under the same key, finds its ledger row and does nothing a second time.
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
    return await this.redeem_(input, sharedContext)
  }

  /**
   * Puts `amount` back on the card for a cart it paid (a return, a cancellation). Tied to that redemption: refused
   * without one on the same card and cart, and refused when the refunds together would exceed it, so a refund
   * cannot make money (barracuda, #813). `key` names the refund event: the same event repeated refunds once, a
   * second partial return refunds again.
   */
  @InjectManager()
  async refundGiftCard(input: GiftCardRefund, @MedusaContext() sharedContext: Context = {}) {
    return await this.refund_(input, sharedContext)
  }

  /** The caller's transaction, with the card's row locked: one balance move per card at a time. */
  private async lockedCard(id: string, transactionManager: unknown): Promise<Knex> {
    const knex = (
      transactionManager as { getTransactionContext(): Knex | undefined } | undefined
    )?.getTransactionContext()
    if (!knex)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "A gift card balance moves only inside a transaction."
      )
    const card = await knex.raw(
      `select id from gift_card where id = ? and deleted_at is null for update`,
      [id]
    )
    if (!card.rows.length)
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nincs ilyen ajándékkártya.")
    return knex
  }

  @InjectTransactionManager()
  protected async redeem_(
    input: GiftCardMovement,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ balance: number; repeated: boolean }> {
    wholePositive(input.amount)
    const knex = await this.lockedCard(input.gift_card_id, sharedContext.transactionManager)
    const done = await knex.raw(
      `select balance_after from gift_card_transaction
       where gift_card_id = ? and kind = 'redeem' and reference = ? and deleted_at is null`,
      [input.gift_card_id, input.reference]
    )
    if (done.rows.length) return { balance: Number(done.rows[0]!.balance_after), repeated: true }
    const updated = await knex.raw(
      `update gift_card set balance = balance - ?, updated_at = now()
       where id = ? and deleted_at is null and status = 'active' and balance >= ?
         and (expires_at is null or expires_at > now())
       returning balance`,
      [input.amount, input.gift_card_id, input.amount]
    )
    if (!updated.rows.length)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Az ajándékkártya nem fedezi ezt az összeget, nem aktív, vagy lejárt."
      )
    const balance = Number(updated.rows[0]!.balance)
    await this.ledger(knex, {
      gift_card_id: input.gift_card_id,
      kind: "redeem",
      amount: -input.amount,
      balance_after: balance,
      reference: input.reference,
      idempotency_key: null,
    })
    return { balance, repeated: false }
  }

  @InjectTransactionManager()
  protected async refund_(
    input: GiftCardRefund,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ balance: number; repeated: boolean }> {
    wholePositive(input.amount)
    if (!input.key?.trim())
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "A refund needs its own key.")
    const knex = await this.lockedCard(input.gift_card_id, sharedContext.transactionManager)
    const done = await knex.raw(
      `select gift_card_id, balance_after from gift_card_transaction where idempotency_key = ? and deleted_at is null`,
      [input.key]
    )
    if (done.rows.length) {
      if (done.rows[0]!.gift_card_id !== input.gift_card_id)
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Ez a visszatérítés-kulcs egy másik kártyához tartozik.")
      return { balance: Number(done.rows[0]!.balance_after), repeated: true }
    }
    const redeemed = await knex.raw(
      `select -amount as amount from gift_card_transaction
       where gift_card_id = ? and kind = 'redeem' and reference = ? and deleted_at is null`,
      [input.gift_card_id, input.reference]
    )
    if (!redeemed.rows.length)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Erről a kártyáról erre a kosárra nem volt beváltás, nincs mit visszatéríteni."
      )
    const refunded = await knex.raw(
      `select coalesce(sum(amount), 0) as amount from gift_card_transaction
       where gift_card_id = ? and kind = 'refund' and reference = ? and deleted_at is null`,
      [input.gift_card_id, input.reference]
    )
    const left = Number(redeemed.rows[0]!.amount) - Number(refunded.rows[0]!.amount)
    if (input.amount > left)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `A visszatérítés több lenne, mint ami a beváltásból még visszajár (${left}).`
      )
    const updated = await knex.raw(
      `update gift_card set balance = balance + ?, updated_at = now() where id = ? returning balance`,
      [input.amount, input.gift_card_id]
    )
    const balance = Number(updated.rows[0]!.balance)
    await this.ledger(knex, {
      gift_card_id: input.gift_card_id,
      kind: "refund",
      amount: input.amount,
      balance_after: balance,
      reference: input.reference,
      idempotency_key: input.key,
    })
    return { balance, repeated: false }
  }

  private async ledger(
    knex: Knex,
    row: {
      gift_card_id: string
      kind: "redeem" | "refund"
      amount: number
      balance_after: number
      reference: string
      idempotency_key: string | null
    }
  ) {
    await knex.raw(
      `insert into gift_card_transaction
         (id, gift_card_id, kind, amount, balance_after, reference, idempotency_key, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, now(), now())`,
      [
        generateEntityId(undefined, "gctx"),
        row.gift_card_id,
        row.kind,
        row.amount,
        row.balance_after,
        row.reference,
        row.idempotency_key,
      ]
    )
  }

  /** A disabled card cannot pay; its balance and ledger stay. */
  @InjectManager()
  async disableGiftCard(id: string, @MedusaContext() sharedContext: Context = {}) {
    return await this.updateGiftCards({ id, status: "disabled" }, sharedContext)
  }
}

export default GiftCardModuleService
