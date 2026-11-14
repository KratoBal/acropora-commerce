/**
 * WHICH CART LINE BLOCKS THE STORE PICKUP (V2.5 slice B, card ffa5d8c6). Medusa marks a pickup shipping option
 * `insufficient_inventory` when some line has no stock at the option's stock location, and the shipping step then greys the
 * option out without saying why. The cart query carries no per-line stock (measured on the test shop, 2026-11-14: the cart
 * item's variant has `manage_inventory` and `allow_backorder`, no `inventory_quantity`), so the storefront cannot name the
 * line itself. This answers it, with the same stock check Medusa makes, AT THE PICKUP LOCATION (the product page's number is
 * the sum over all locations and can say "in stock" while the shop shelf is empty).
 *
 * THE DECISION IS PURE (`shortLinesAt`), the Medusa wiring is thin (`pickupShortLinesOfCart`). What turns this red is a line
 * with stock named as short, a short line missed, a line that does not manage stock named as short, or the order and the
 * duplicates of the answer.
 */
export type PickupLineFacts = {
  title: string
  handle: string | null
  quantity: number
}

export type PickupShortLine = { title: string; handle: string | null }

/** The lines that have no stock at the location. `hasStockAt` is the per-line check; the answer keeps the cart's order. */
export async function shortLinesAt(
  lines: readonly PickupLineFacts[],
  hasStockAt: (line: PickupLineFacts) => Promise<boolean>
): Promise<PickupShortLine[]> {
  const short: PickupShortLine[] = []
  for (const line of lines) {
    if (await hasStockAt(line)) continue
    short.push({ title: line.title, handle: line.handle })
  }
  return short
}

/** One shipping option as the cart listing returns it: only what the pickup-location check reads. */
export type CartOptionFacts = {
  service_zone?: {
    fulfillment_set?: {
      type?: string | null
      location?: { id?: string | null } | null
    } | null
  } | null
}

/**
 * THE LOCATION MUST BE ONE OF THE CART'S OWN PICKUP LOCATIONS (barracuda, #766). The route answers, line by line, "has stock /
 * has none" for a stock location; left open it would answer for ANY location, and a shopper changing the quantity in the cart
 * could read a shelf's exact stock off the answers. So the location is accepted only when it belongs to a PICKUP-type
 * fulfillment set of the options the cart itself is offered (the same listing `GET /store/shipping-options` returns): a foreign
 * location, and the location of a delivery option, are refused.
 */
export function isCartPickupLocation(options: readonly CartOptionFacts[], locationId: string): boolean {
  return options.some((option) => {
    const set = option.service_zone?.fulfillment_set
    return set?.type === "pickup" && set.location?.id === locationId
  })
}
