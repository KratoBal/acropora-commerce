import { model } from "@medusajs/framework/utils"

/**
 * A GIFT CARD (card 495c0007; Balázs, 2026-11-18: "Ajándékkártya kell"). A means of payment, not a discount: at the
 * checkout it pays what is left after the price, the promotions and the shipping, through a cart credit line.
 *
 * THE CODE IS A SECRET, held like a password: only its SHA-256 (`code_hash`, of the normalized code) and its last four
 * characters (`code_last4`, to tell two cards apart on a screen) are kept. The full code exists once, in the answer
 * to the issue call.
 *
 *   initial_amount   what it was issued for, in whole units of `currency_code` (forint)
 *   balance          what is left; only the service changes it, always with a ledger row (`gift_card_transaction`)
 *   status           `active` or `disabled` (a disabled card cannot pay; its balance stays, for the record)
 *   expires_at       null: does not expire (whether it should is Balázs's call, open on the card)
 */
export const GiftCard = model
  .define("gift_card", {
    id: model.id({ prefix: "gcard" }).primaryKey(),
    code_hash: model.text(),
    code_last4: model.text(),
    currency_code: model.text().default("huf"),
    initial_amount: model.number(),
    balance: model.number(),
    status: model.text().default("active"),
    expires_at: model.dateTime().nullable(),
    recipient_email: model.text().nullable(),
    note: model.text().nullable(),
    issued_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_gift_card_code_hash_unique",
      on: ["code_hash"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default GiftCard
