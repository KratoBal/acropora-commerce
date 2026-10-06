import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

/**
 * THE ORDER MAXIMUM, HELD BY THE CART ITSELF (card 6994c9a3; Balázs,
 * 2026-10-06 22:05 UTC, „Mehet a 2,7,6,8”, test shop only).
 *
 * The projection puts the UNAS order maximum into the product's metadata
 * (`unas_maximum_order_quantity`, a string), and the storefront already reads
 * it: the product page and the cart line's quantity choice stop there. The
 * backend did not, so anything that is not that picker went past it: adding
 * the same product again from its page (the page does not count what the cart
 * already holds), the category card's button, or a direct Store API call.
 *
 * Measured on the test shop on 2026-09-08: four products carry a maximum
 * (100/1000 and 10/100 minimum/maximum).
 *
 * The value is read as the storefront reads it (`minimum-order-quantity.ts`):
 * a whole number of at least 1, anything else is no limit. A broken value
 * never stops a purchase.
 */
export const ORDER_MAXIMUM_METADATA_KEY = "unas_maximum_order_quantity"

export const orderMaximumOf = (
  metadata: Record<string, unknown> | null | undefined
): number | null => {
  const raw = metadata?.[ORDER_MAXIMUM_METADATA_KEY]
  if (typeof raw !== "string" && typeof raw !== "number") return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 ? value : null
}

/** The sentence, or null when the new quantity fits. */
export const orderMaximumRefusal = (input: {
  title: string | null
  maximum: number | null
  quantity: number
}): string | null =>
  input.maximum !== null && input.quantity > input.maximum
    ? `${input.title ?? "Ebből a termékből"}: egy rendelésbe legfeljebb ${input.maximum} darab tehető.`
    : null

export type OrderMaximumChange =
  /** A new line, or more of a variant already in the cart: it adds up. */
  | { kind: "add"; variant_id: string; quantity: number }
  /** A line's quantity set: it replaces that line, the other lines still count. */
  | { kind: "set"; line_id: string; quantity: number }

/**
 * Refuses (NOT_ALLOWED) a change that would put more of a product into the
 * cart than its order maximum. The cart is read here, because the hook's cart
 * carries only the pricing fields, not the lines.
 */
export async function assertOrderMaximum(
  container: Pick<MedusaContainer, "resolve">,
  cartId: string,
  changes: OrderMaximumChange[]
): Promise<void> {
  if (!changes.length) return
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "items.id", "items.variant_id", "items.quantity"],
  })
  const lines: { id: string; variant_id: string | null; quantity: number }[] = (
    (carts?.[0] as any)?.items ?? []
  )
    .filter(Boolean)
    .map((line: any) => ({
      id: line.id,
      variant_id: line.variant_id ?? null,
      quantity: Number(line.quantity),
    }))

  const variantOf = (change: OrderMaximumChange) =>
    change.kind === "add"
      ? change.variant_id
      : (lines.find((line) => line.id === change.line_id)?.variant_id ?? null)
  const variantIds = [
    ...new Set(changes.map(variantOf).filter((id): id is string => !!id)),
  ]
  if (!variantIds.length) return

  const { data: variants } = await query.graph({
    entity: "variant",
    filters: { id: variantIds },
    fields: ["id", "product.title", "product.metadata"],
  })
  const productOf = new Map(
    (variants ?? []).map((variant: any) => [
      variant.id,
      {
        title: variant.product?.title ?? null,
        maximum: orderMaximumOf(variant.product?.metadata),
      },
    ])
  )

  for (const change of changes) {
    const variantId = variantOf(change)
    const product = variantId ? productOf.get(variantId) : undefined
    if (!variantId || !product || product.maximum === null) continue
    const others = lines
      .filter(
        (line) =>
          line.variant_id === variantId &&
          (change.kind === "add" || line.id !== change.line_id)
      )
      .reduce((sum, line) => sum + line.quantity, 0)
    const refusal = orderMaximumRefusal({
      title: product.title,
      maximum: product.maximum,
      quantity: others + change.quantity,
    })
    if (refusal) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, refusal)
  }
}
