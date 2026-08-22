import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import ShippingAttributesModule from "../modules/shipping-attributes"

/**
 * Read-only link: the shipping-attributes module owns `product_id`, so there is
 * no link table and no second source of truth. Query can expand
 * `shipping_attribute.product` from here.
 *
 * The reverse expansion (`product.shipping_attribute`) is NOT created by a
 * read-only link in Medusa 2.19: `defineReadOnlyLink` only extends the entity
 * that holds the foreign key. Nothing needs it, because the attributes can be
 * fetched directly by `product_id`.
 */
export default defineLink(
  {
    linkable: ShippingAttributesModule.linkable.shippingAttribute,
    field: "product_id",
  },
  ProductModule.linkable.product,
  { readOnly: true }
)
