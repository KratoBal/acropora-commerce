import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { saveCartLocale } from "../../../../workflows/utils/order-locale"
import type { StorePostCartLocaleType } from "../validators"

/**
 * POST /store/cart-locale/:cart_id
 *
 * The language the customer is ordering in (hu | en), onto the cart, which
 * carries it to the order; the shop's mails follow it. Only this one key; the
 * cart's other metadata stays out of the browser's reach. 404: no such cart;
 * 409: already ordered.
 */
export const POST = async (req: MedusaRequest<StorePostCartLocaleType>, res: MedusaResponse) => {
  const result = await saveCartLocale(req.scope, req.params.cart_id, req.validatedBody.locale)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (result.status === "completed") {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett." })
    return
  }
  res.json({ locale: result.locale })
}
