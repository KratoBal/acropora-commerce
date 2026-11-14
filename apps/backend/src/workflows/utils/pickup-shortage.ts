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
