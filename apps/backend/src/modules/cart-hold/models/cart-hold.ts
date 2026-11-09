import { model } from "@medusajs/framework/utils"

/**
 * THE UNIQUE PIECE KEPT FOR ONE CART (V2.3, card 52024fc0). A soft hold, not Medusa's reservation: Medusa reserves
 * stock only when a cart is completed (`complete-cart`), so two buyers could put the same one piece in their carts
 * and the first to pay got it (V2.5 says "közben elkelt" to the other). A hold says "this piece is in that cart
 * until `expires_at`"; another cart cannot add it meanwhile, and cannot place an order with it.
 *
 * ONE ROW PER VARIANT, EVER: a later cart takes the row over (`cart_id`, `expires_at` rewritten), so the table is
 * never bigger than the number of unique pieces and needs no cleaning job.
 *
 *   variant_id   the unique piece's variant (`metadata.unique_piece` on its product).
 *   cart_id      the HOLDER: the cart the buyer filled. A mixed cart's pickup half (split-completion.ts) holds
 *                through its parent, so moving the line between the two never looks like a second cart.
 *   expires_at   the end of the hold. Past it the row is dead without anything running (it is read, not swept).
 *
 * A hold is also dead when its holder no longer has the piece on an open cart (the line was removed, or the cart
 * became an order): that is checked when it matters, not written here (`cart-hold.ts` in workflows/utils).
 */
export const CartHold = model
  .define("cart_hold", {
    id: model.id({ prefix: "chold" }).primaryKey(),
    variant_id: model.text(),
    cart_id: model.text(),
    expires_at: model.dateTime(),
  })
  .indexes([
    {
      // the backstop under the lock: never two rows for one piece
      name: "IDX_cart_hold_variant_unique",
      on: ["variant_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      // the per-cart limit's lookup
      name: "IDX_cart_hold_cart_id",
      on: ["cart_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default CartHold
