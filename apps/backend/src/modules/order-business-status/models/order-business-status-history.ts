import { model } from "@medusajs/framework/utils"

export const OrderBusinessStatusHistory = model.define(
  "order_business_status_history",
  {
    id: model.id({ prefix: "ordbsthist" }).primaryKey(),
    order_id: model.text(),
    from_status: model.text().nullable(),
    to_status: model.text(),
    actor: model.text(),
    source: model.text(),
  },
)

export default OrderBusinessStatusHistory
