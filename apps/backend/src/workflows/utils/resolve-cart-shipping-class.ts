import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  ShippingClassResult,
  ShippingRelevantItem,
  computeShippingClass,
} from "./compute-shipping-class"
import { createLivestockPredicate } from "./livestock"

/**
 * The only shape this resolver reads off a cart line.
 *
 * `variant_id` is the anchor: `prepareLineItemData` sets it as `variant?.id`
 * with NO caller fallback, and the store schema requires it, so it can neither
 * be absent nor forged. Everything else is looked up from it.
 */
export type CartLineForShipping = {
  id?: string | null
  variant_id?: string | null
  requires_shipping?: boolean | null
}

export type CartForShipping = {
  items?: CartLineForShipping[] | null
}

type VariantRow = {
  id: string
  product?: { id?: string | null; type_id?: string | null } | null
}

type ShippingAttributeRow = {
  product_id: string
  pickup_only?: boolean | null
  foxpost_forbidden?: boolean | null
  is_heavy?: boolean | null
  is_frozen?: boolean | null
}

/**
 * Pure normalization: cart lines plus the two lookups become the flat item list
 * that `computeShippingClass` understands. No container, no queries, no
 * precedence. The precedence stays in `computeShippingClass`.
 */
export const normalizeCartShippingItems = (
  items: CartLineForShipping[],
  variantsById: Map<string, VariantRow>,
  attributesByProductId: Map<string, ShippingAttributeRow>,
  isLivestockProductType: (productTypeId?: string | null) => boolean
): ShippingRelevantItem[] =>
  items.map((item) => {
    const variant = item.variant_id
      ? variantsById.get(item.variant_id)
      : undefined
    const productId = variant?.product?.id ?? undefined
    const attributes = productId
      ? attributesByProductId.get(productId)
      : undefined

    return {
      line_item_id: item.id ?? null,
      // A product with no shipping-attributes row is unrestricted, not unknown.
      pickup_only: attributes?.pickup_only === true,
      foxpost_forbidden: attributes?.foxpost_forbidden === true,
      // Heavy is a hand-set product flag, never derived from variant weight.
      is_heavy: attributes?.is_heavy === true,
      is_frozen: attributes?.is_frozen === true,
      is_livestock: isLivestockProductType(variant?.product?.type_id),
      requires_shipping: item.requires_shipping,
    }
  })

/**
 * Resolves the cart-wide scalar shipping class.
 *
 * Called from BOTH shipping-option listing workflows. It deliberately reads
 * only `items[].id`, `items[].variant_id` and `items[].requires_shipping`,
 * because the two workflows populate the cart with DIFFERENT field sets.
 * Reading anything else would make the same function decide differently in the
 * two places, without erroring.
 */
export const resolveCartShippingClass = async (
  cart: CartForShipping,
  container: { resolve: (key: string) => any }
): Promise<ShippingClassResult> => {
  const items = (cart?.items ?? []).filter(Boolean)

  if (!items.length) {
    return computeShippingClass([])
  }

  const variantIds = Array.from(
    new Set(
      items
        .map((item) => item.variant_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  )

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const variantsById = new Map<string, VariantRow>()

  if (variantIds.length) {
    const { data: variants } = await query.graph({
      entity: "variant",
      filters: { id: variantIds },
      // No weight: the heavy decision is a product flag, not a measurement.
      // The variant is still the anchor, because it is the only line-item field
      // the caller cannot set.
      fields: ["id", "product.id", "product.type_id"],
    })

    for (const variant of (variants ?? []) as VariantRow[]) {
      variantsById.set(variant.id, variant)
    }
  }

  const productIds = Array.from(
    new Set(
      Array.from(variantsById.values())
        .map((variant) => variant.product?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  )

  const attributesByProductId = new Map<string, ShippingAttributeRow>()

  if (productIds.length) {
    // A second query rather than one traversal: the read-only link only extends
    // the entity holding the foreign key, so `variant.product.shipping_attribute`
    // does not exist. Both queries are id-filtered lookups.
    const { data: attributes } = await query.graph({
      entity: "shipping_attribute",
      filters: { product_id: productIds },
      fields: [
        "product_id",
        "pickup_only",
        "foxpost_forbidden",
        "is_heavy",
        "is_frozen",
      ],
    })

    for (const row of (attributes ?? []) as ShippingAttributeRow[]) {
      attributesByProductId.set(row.product_id, row)
    }
  }

  return computeShippingClass(
    normalizeCartShippingItems(
      items,
      variantsById,
      attributesByProductId,
      createLivestockPredicate()
    )
  )
}
