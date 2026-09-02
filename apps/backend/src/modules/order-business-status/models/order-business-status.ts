import { model } from "@medusajs/framework/utils"

export const OrderBusinessStatusModel = model
  .define("order_business_status", {
    id: model.id({ prefix: "ordbst" }).primaryKey(),
    order_id: model.text(),
    status: model.text(),
  })
  .indexes([
    {
      name: "IDX_order_business_status_order_id_unique",
      on: ["order_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default OrderBusinessStatusModel
