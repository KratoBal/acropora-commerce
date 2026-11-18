import { medusaPromotionService } from "./loaders/install"

/**
 * The module's service: it only tells whether the rounding is on. The rounding itself is the wrap the loader puts on
 * Medusa's promotion service (`rounding.ts`), because the discounts are computed there, in Medusa's own workflows.
 */
export default class WholeCurrencyPromotionsModuleService {
  roundingInstalled(): boolean {
    return Boolean(medusaPromotionService().prototype[Symbol.for("acropora.wholeCurrencyPromotions")])
  }
}
