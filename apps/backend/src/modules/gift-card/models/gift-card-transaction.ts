import { model } from "@medusajs/framework/utils"

/**
 * A GIFT CARD'S LEDGER (card 495c0007): every change of a balance, signed, with what it left. `issue` and `refund`
 * add, `redeem` takes away, `adjust` is a hand correction either way.
 *
 * One `redeem` and one `refund` per card and order: the partial unique index makes a repeated cart completion or a
 * repeated refund event a no-op instead of a second charge.
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
    order_id: model.text().nullable(),
    note: model.text().nullable(),
  })
  .indexes([
    { name: "IDX_gift_card_transaction_card", on: ["gift_card_id"], where: "deleted_at IS NULL" },
    {
      name: "IDX_gift_card_transaction_card_kind_order_unique",
      on: ["gift_card_id", "kind", "order_id"],
      unique: true,
      where: "deleted_at IS NULL AND order_id IS NOT NULL",
    },
  ])

export default GiftCardTransaction
