import type { ICartModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"

import { loadCartCashOnDeliveryFeeState } from "../utils/load-cart-cod-fee-state"

/**
 * Takes a cash-on-delivery fee off a cart that no longer pays cash on delivery.
 *
 * This hook runs inside every cart refresh, which means after every cart
 * operation, and just before the payment collection is refreshed. That
 * position is what makes it useful: a fee removed here is already gone when
 * the payment collection reads the total in the next step.
 *
 * IT REMOVES, AND IT NEVER ADDS. The asymmetry is deliberate.
 *
 * Removing is safe in a way adding is not. It only ever lowers the total, and
 * it undoes a charge the cart is no longer entitled to make, which is the
 * failure that actually happens: the customer picks cash on delivery, then
 * switches to a heavy delivery or store pickup, where it is not offered. That
 * change goes through a cart operation, so this hook sees it.
 *
 * Adding from here would charge a customer more as a side effect of an
 * unrelated action, at a moment they are not looking at the payment step, and
 * it would do so from a background path rather than the one that creates every
 * other fee. The fee is added where the customer chooses to pay that way: on
 * POST /store/payment-options.
 *
 * IT NEVER THROWS. Every cart operation in the store runs through here, so an
 * error raised here would not fail the fee: it would fail adding an item to a
 * cart. What it cannot repair, it writes down, and cart completion refuses the
 * order rather than turning a mismatch into money.
 */
refreshCartItemsWorkflow.hooks.beforeRefreshingPaymentCollection(
  async ({ input }, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const cartId = input?.cart_id

    if (!cartId) {
      return
    }

    try {
      const state = await loadCartCashOnDeliveryFeeState(cartId, container)

      if (!state) {
        return
      }

      const { plan } = state

      if (plan.action === "remove") {
        /*
          A TIPUS ITT ALL, ES NEM A KIKOVETKEZTETESRE BIZZUK.

          A `MedusaContainer` ket tulterhelest ad: az elso a `Cradle`
          kulcsaira szol, a masodik egy sima sztring-kulcsra. A `Cradle`
          alapertelmezese a `ModuleImplementations`, ami a `@medusajs/types`-ban
          URES interfesz -- a sajat kommentje szerint "acts as a bucket that
          other modules can fill using declaration merging". A feltoltest a
          GENERALT `.medusa/types/augmentation-refs.d.ts` vegzi
          (`/// <reference types="@medusajs/medusa/cart" />` es tarsai).

          Az a fajl a CI-ben NINCS -- ezt a `verify` sajat mereseszkoze irja ki
          minden futason. Ha az augmentacio nincs a programban, a kulcs nem
          `keyof Cradle`, a masodik tulterheles all be, es a tipus `unknown`
          lesz. Pontosan ezt a hibat adta a CI ezen a soron: TS2571,
          2026-09-10 06:14.

          A TIPUS FORRASA, hogy ne talalgatas legyen: a `@medusajs/types`
          `dist/cart/service.d.ts`-ben all az `ICartModuleService`, es rajta
          `deleteLineItems(ids: string[], sharedContext?: Context)` -- pont az
          a hivas, amit itt teszunk.
        */
        await container
          .resolve<ICartModuleService>(Modules.CART)
          .deleteLineItems(plan.removeIds)

        logger.info(
          `Cart ${cartId}: removed ${plan.removeIds.length} cash-on-delivery fee line(s). ${plan.reason}`
        )

        return
      }

      if (plan.action === "add") {
        logger.warn(
          `Cart ${cartId}: pays cash on delivery but carries no handling fee. ${plan.reason} The fee is added when the payment options are refreshed for the cart.`
        )

        return
      }

      if (plan.staleAmount) {
        logger.warn(
          `Cart ${cartId}: carries a cash-on-delivery fee of ${plan.staleAmount.current} while ${plan.staleAmount.configured} is configured. The charged amount is kept.`
        )
      }
    } catch (error) {
      logger.error(
        `Cart ${cartId}: could not reconcile the cash-on-delivery fee. ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }
)
