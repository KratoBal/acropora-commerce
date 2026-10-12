import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import BrandModule from "../modules/brand"

/**
 * Read-only link (SEO P0 PR 11), the shipping-attributes pattern: the brand
 * module's `product_brand` row owns `product_id`, so there is no link table
 * and no second source of truth. Dropping this file and the projection's
 * link write is the rollback; the brand collection is not touched by either.
 */
export default defineLink(
  {
    linkable: BrandModule.linkable.productBrand,
    field: "product_id",
  },
  ProductModule.linkable.product,
  { readOnly: true }
)
