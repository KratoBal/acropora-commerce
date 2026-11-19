import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"

import { assertNoCouponWithPersonalDiscount, newCodes } from "../utils/personal-discount-coupon"

/*
  A SAJÁT KEDVEZMÉNY MELLETT NINCS ÚJ KUPON (20713f62). Ez a munkafolyamat fut a kirakat kódbeírásakor (a kosár
  frissítése REPLACE-szel, a teljes új kódlistával), a `/store/carts/:id/promotions` hívásnál (ADD), és minden sima
  kosár-frissítésnél is (REPLACE a meglévő kódokkal). Ezért csak az ÚJ kód számít: egy frissítés, ami a kosár kódjait
  hagyja, nem bukhat el, különben egy már ott álló kupon az egész kosarat megakasztaná. Ott a lezárás őre áll.
*/
updateCartPromotionsWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const action = input.action ?? PromotionActions.ADD
  if (action === PromotionActions.REMOVE) return
  const current = ((cart as { promotions?: { code?: string | null }[] | null }).promotions ?? []).map(
    (promotion) => promotion?.code
  )
  const customerId =
    (cart as { customer_id?: string | null; customer?: { id?: string | null } | null }).customer_id ??
    (cart as { customer?: { id?: string | null } | null }).customer?.id
  await assertNoCouponWithPersonalDiscount(container as never, customerId, newCodes(input.promo_codes, current))
})
