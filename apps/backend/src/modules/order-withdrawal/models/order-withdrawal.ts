import { model } from "@medusajs/framework/utils"

/**
 * ONE ROW PER DECLARATION. `item_ids` is an array of text (the order's line item ids the customer withdraws from).
 * `customer_name` is the name the customer typed into the declaration: the decree's declaration carries the
 * consumer's name, and it may differ from the billing name. The e-mail address is NOT stored here: it is the
 * order's own (the declaration is accepted only with it), and the OS reads it from the order. THE TIME OF RECEIPT IS
 * `created_at`, set by the server: the customer's clock is never taken.
 */
export const OrderWithdrawal = model
  .define("order_withdrawal", {
    id: model.id({ prefix: "ordwdr" }).primaryKey(),
    order_id: model.text(),
    customer_name: model.text(),
    item_ids: model.array(),
    status: model.text().default("new"),
    pulled_at: model.dateTime().nullable(),
  })
  .indexes([
    { name: "IDX_order_withdrawal_order_id", on: ["order_id"], where: "deleted_at IS NULL" },
    { name: "IDX_order_withdrawal_status", on: ["status"], where: "deleted_at IS NULL" },
  ])

export default OrderWithdrawal
