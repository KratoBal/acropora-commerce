import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * NO DISCOUNT ON SHIPPING (card 790da0cd; Balázs, 2026-10-06 16:44:50 UTC:
 * „Szazalekos kupon es minden egyeb kedvezmeny: csak a termekek arabol
 * vonodhat. Szallitasbol nem.”).
 *
 * Medusa 2.20.1 spreads an `order` or `items` promotion over the line items
 * only; the shipping is reached by a `shipping_methods` target alone
 * (promotion-module `computeActions`). So refusing that target where a
 * promotion is created or changed (`POST /admin/promotions`,
 * `POST /admin/promotions/:id`) is enough for the shipping side. The fee lines
 * are kept out on their own (`is_discountable: false`, cod-fee-line-item).
 *
 * Measured on the test shop before this went in (acrobot 27151): no promotion
 * there had the shipping target, so nothing already stored needs undoing.
 *
 * NOT FOR LOYALTY POINTS: Balázs said those may pay for shipping too. Point
 * redemption does not exist yet; when it is built it must not go through a
 * promotion this guard refuses (written on the card).
 */
export const SHIPPING_DISCOUNT_REFUSAL =
  "Kedvezmény csak a termékek árából vonódhat, a szállítási díjból nem: a „shipping_methods” cél nem használható."

export const refuseShippingDiscount = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const method = (req.body as { application_method?: unknown } | undefined)
    ?.application_method
  const target =
    method && typeof method === "object" && !Array.isArray(method)
      ? (method as { target_type?: unknown }).target_type
      : undefined

  if (target === "shipping_methods") {
    res.status(400).json({ type: "invalid_data", message: SHIPPING_DISCOUNT_REFUSAL })
    return
  }

  next()
}
