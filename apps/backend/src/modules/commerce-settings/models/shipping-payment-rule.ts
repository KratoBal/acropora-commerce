import { model } from "@medusajs/framework/utils";

/**
 * Which payment methods a shipping method allows, and in what order they are
 * offered.
 *
 * WHY A TABLE AND NOT A SETTING ROW. The neighbouring `commerce_setting` model
 * is key/value and stores its values as text, for a reason it states itself:
 * every value there is a scalar. This is not a scalar. It is a many-to-many
 * relation with an order on it, and squeezing it into one text value would
 * mean parsing JSON back out on every checkout and losing the one thing a
 * table gives for free - the ordering column that answers half of the request
 * this model exists for.
 *
 * ONE ROW PER ALLOWED PAIR. Absence is the denial: there is no `allowed` flag,
 * because a flag creates two ways to express the same thing and eventually
 * they disagree. Cash on delivery is not offered on store pickup because that
 * pair has no row, not because a row says false.
 *
 * `position` ORDERS THE PAYMENT LIST WITHIN ONE SHIPPING METHOD, which is
 * where the customer actually sees it: the shipping method is chosen first,
 * and the payment list follows from it. The display order of the SHIPPING
 * methods themselves is not here - that belongs to the shipping option, and it
 * is a separate piece of work.
 *
 * The roles are stored as text rather than as a database enum. The values come
 * from `ShippingOptionRole` and `PaymentRole` in the workflow utils, and a
 * database enum would need a migration every time one is added - including the
 * bank-transfer method that is already asked for and does not exist yet.
 * Validation happens at the edges instead, like it does for the settings keys.
 */
export const ShippingPaymentRule = model
  .define("shipping_payment_rule", {
    id: model.id({ prefix: "spr" }).primaryKey(),

    /** A `ShippingOptionRole` value, for example `GLS_NORMAL`. */
    shipping_role: model.text(),

    /** A `PaymentRole` value, for example `COD`. */
    payment_role: model.text(),

    /** Ascending display order inside this shipping role's payment list. */
    position: model.number(),
  })
  .indexes([
    {
      name: "IDX_shipping_payment_rule_pair_unique",
      on: ["shipping_role", "payment_role"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ]);

export default ShippingPaymentRule;
