import { model } from "@medusajs/framework/utils"

/**
 * A PHOTO (IMAGE) A CUSTOMER UPLOADED FOR A REPORT. It is a row of its own so that the shop, not the browser, says which
 * file belongs to which order: the report names photo ids, the server checks that each is this order's and not
 * attached to another report, and only then links it (`report_id`). A photo with no `report_id` is an upload
 * that was never submitted (a later cleanup job's to remove).
 */
export const OrderProblemImage = model
  .define("order_problem_image", {
    id: model.id({ prefix: "ordprbimg" }).primaryKey(),
    order_id: model.text(),
    report_id: model.text().nullable(),
    /** the key (id) of the file in the shop's file module */
    file_key: model.text(),
    /** the address the file module gave */
    url: model.text(),
    mime_type: model.text(),
    size_bytes: model.number(),
  })
  .indexes([
    { name: "IDX_order_problem_image_order_id", on: ["order_id"], where: "deleted_at IS NULL" },
    { name: "IDX_order_problem_image_report_id", on: ["report_id"], where: "deleted_at IS NULL" },
  ])

export default OrderProblemImage
