import { model } from "@medusajs/framework/utils"

/**
 * ONE EDITED CUSTOMER TEXT (card 7bfca4eb; Balázs, 2026-11-24: every text to the customer editable on one page in the OS).
 *
 * A row is an OVERRIDE of one storefront dictionary key in one language: the Acropora OS writes it, the storefront reads it on top
 * of its dictionary. A key with no row is the dictionary's own text, so the storefront works with an empty table. The keys that
 * may be written are the catalog's (`catalog.generated.ts`, generated from the storefront dictionary); `locale` is `hu` or `en`.
 */
export const CustomerText = model
  .define("customer_text", {
    id: model.id({ prefix: "ctxt" }).primaryKey(),
    key: model.text(),
    locale: model.text(),
    value: model.text(),
  })
  .indexes([
    {
      name: "IDX_customer_text_key_locale_unique",
      on: ["key", "locale"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default CustomerText
