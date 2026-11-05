import { model } from "@medusajs/framework/utils"

/**
 * ONE ROW PER WITHDRAWN LINE, AND THE DATABASE IS THE REFEREE. A line of an order can be declared once: the unique index
 * on (order_id, item_id) makes a second declaration for the same line impossible, whatever two racing requests did
 * before it. The declaration row (`order_withdrawal`) keeps the whole declaration (name, time of receipt, the lines);
 * this table only claims each line for it, so that the claim is atomic (one bulk insert: all of its lines or none).
 * Before this table the exclusion was check, insert, check again, which could leave both rows standing when the later
 * row carried the earlier-looking time (barracuda, #685 review).
 */
export const OrderWithdrawalItem = model
  .define("order_withdrawal_item", {
    id: model.id({ prefix: "ordwdi" }).primaryKey(),
    withdrawal_id: model.text(),
    order_id: model.text(),
    item_id: model.text(),
  })
  .indexes([
    { name: "IDX_order_withdrawal_item_order_item", on: ["order_id", "item_id"], unique: true, where: "deleted_at IS NULL" },
    { name: "IDX_order_withdrawal_item_withdrawal_id", on: ["withdrawal_id"], where: "deleted_at IS NULL" },
  ])

export default OrderWithdrawalItem
