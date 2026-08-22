import { model } from "@medusajs/framework/utils"

/**
 * Store-wide operational settings that must be editable without a deployment.
 *
 * A key/value table rather than one typed column per setting: the values are
 * operational numbers that change with business decisions (the cash-on-delivery
 * fee today, more later), and adding one needs a row, not a migration. Typing
 * happens at the edges instead, in the accessor and the API validator, so a
 * malformed value cannot reach the checkout.
 */
export const CommerceSetting = model
  .define("commerce_setting", {
    id: model.id({ prefix: "cset" }).primaryKey(),

    /** Stable, machine-readable key, for example `cash_on_delivery_fee_huf`. */
    key: model.text(),

    /**
     * Stored as text, not as JSON.
     *
     * `model.json()` is typed as `Record<string, unknown>` in Medusa 2.19, so a
     * bare number cannot be written through the typed service without a cast,
     * and every value here is a scalar. Text plus validation at the edges is the
     * honest shape: `normalizeCashOnDeliveryFee` accepts a string and returns a
     * number, so nothing downstream sees the difference.
     */
    value: model.text(),

    /** What this setting controls, for whoever edits it in the Admin later. */
    description: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_commerce_setting_key_unique",
      on: ["key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default CommerceSetting
