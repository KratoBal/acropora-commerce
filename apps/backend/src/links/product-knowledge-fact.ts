import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import ProductKnowledgeModule from "../modules/product-knowledge"

/**
 * Read-only link, like `product-shipping-attributes.ts`: the knowledge module
 * owns `product_id`, so there is no link table and no second source of truth.
 */
export default defineLink(
  {
    linkable: ProductKnowledgeModule.linkable.productKnowledgeFact,
    field: "product_id",
  },
  ProductModule.linkable.product,
  { readOnly: true }
)
