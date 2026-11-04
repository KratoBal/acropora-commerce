import { model } from "@medusajs/framework/utils"

/**
 * ONE ROW PER REPORT. `item_ids` is an array of text (the order's line item ids). The photos are rows of
 * their own (`order_problem_image`), linked by `report_id`. The e-mail address and the name of the customer
 * are NOT stored here: the order has them, and the OS reads them from the order when it opens the ticket.
 */
export const OrderProblemReport = model
  .define("order_problem_report", {
    id: model.id({ prefix: "ordprb" }).primaryKey(),
    order_id: model.text(),
    kind: model.text(),
    item_ids: model.array(),
    received_at: model.dateTime().nullable(),
    description: model.text(),
    phone: model.text().nullable(),
    status: model.text().default("new"),
    pulled_at: model.dateTime().nullable(),
  })
  .indexes([
    { name: "IDX_order_problem_report_order_id", on: ["order_id"], where: "deleted_at IS NULL" },
    { name: "IDX_order_problem_report_status", on: ["status"], where: "deleted_at IS NULL" },
  ])

export default OrderProblemReport
