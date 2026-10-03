import { model } from "@medusajs/framework/utils"

/**
 * One approved, non-stale customer copy block (`lead`, `body`), projected from
 * Acropora OS. Plain text paragraphs separated by a blank line. SEO title and
 * meta do not live here: they travel in the product's own metadata.
 */
export const ProductKnowledgeCopy = model
  .define("product_knowledge_copy", {
    id: model.id({ prefix: "pkcopy" }).primaryKey(),
    product_id: model.text(),
    block: model.text(),
    body: model.text(),
    revision: model.number(),
  })
  .indexes([
    {
      name: "IDX_product_knowledge_copy_product_id_block_unique",
      on: ["product_id", "block"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductKnowledgeCopy
