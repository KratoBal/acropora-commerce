import { model } from "@medusajs/framework/utils"

/**
 * A GIFT CARD'S LEDGER (card 495c0007): every change of a balance, signed, with what it left. `issue` and `refund`
 * add, `redeem` takes away, `adjust` is a hand correction either way.
 *
 * `reference` is the CART a redemption completed (the amount comes off before the order exists, so the cart is the
 * key that is there both times), and a refund names the same cart. One `redeem` per card and cart: a repeated cart
 * completion is a no-op, not a second charge. A refund is tied to that redemption (barracuda, #813): it needs one
 * on the same card and cart, and the refunds together never exceed it, so a refund cannot make money. Each refund
 * carries its own `idempotency_key` (a return, a cancellation), so a second partial return can still refund, and
 * the same event repeated refunds once.
 */
export const GiftCardTransaction = model
  .define("gift_card_transaction", {
    id: model.id({ prefix: "gctx" }).primaryKey(),
    gift_card_id: model.text(),
    /** `issue`, `redeem`, `refund` or `adjust` (`GIFT_CARD_TRANSACTION_KINDS`). */
    kind: model.text(),
    /** Signed, whole units: + for issue and refund, - for redeem. */
    amount: model.number(),
    balance_after: model.number(),
    reference: model.text().nullable(),
    /** A refund's own key (a return or a cancellation): the same event repeated refunds once. */
    idempotency_key: model.text().nullable(),
    note: model.text().nullable(),
  })
  .indexes([
    { name: "IDX_gift_card_transaction_card", on: ["gift_card_id"], where: "deleted_at IS NULL" },
    {
      name: "IDX_gift_card_transaction_redeem_unique",
      on: ["gift_card_id", "reference"],
      unique: true,
      where: "deleted_at IS NULL AND kind = 'redeem' AND reference IS NOT NULL",
    },
    {
      name: "IDX_gift_card_transaction_idempotency_key_unique",
      on: ["idempotency_key"],
      unique: true,
      where: "deleted_at IS NULL AND idempotency_key IS NOT NULL",
    },
  ])

export default GiftCardTransaction
