import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  amountOf,
  giftCardCreditPlan,
  giftCardCredits,
  type CreditLineRow,
} from "./gift-card-credit"

type Container = { resolve: <T = unknown>(key: string) => T }

/**
 * The cart module's credit-line methods. `ICartModuleService` does not declare them in 2.22, but the module is built
 * with `MedusaService({ ..., CreditLine })`, which generates them, and Medusa's own create/delete credit-line steps
 * call them by these names.
 */
type CartCreditLines = {
  deleteCreditLines(ids: string[]): Promise<void>
  createCreditLines(
    data: {
      cart_id: string
      amount: number
      reference: string | null
      reference_id: string | null
      metadata: Record<string, unknown> | null
    }[]
  ): Promise<unknown>
}

/**
 * KEEPS A CART'S GIFT CARD CREDIT WITHIN WHAT IS LEFT TO PAY (card 495c0007). Runs in every cart refresh, just before
 * the payment collection is refreshed (the cash-on-delivery fee's hook), so a cart that got cheaper never has a
 * negative total and the payment collection reads the capped one.
 *
 * IT ONLY LOWERS, AND IT NEVER THROWS, for the cash-on-delivery fee's reason: every cart operation passes here, and an
 * error would fail adding an item. A cart that got dearer keeps its credit: the customer applies the card again to
 * use more of it. What it cannot repair it logs; the completion hook checks the card again before taking anything.
 */
export async function capGiftCardCredit(
  cartId: string,
  container: Container,
  logger: Logger
): Promise<void> {
  try {
    const query = container.resolve<{
      graph: (input: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
    }>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "credit_line_total", "credit_lines.*"],
      filters: { id: cartId },
    })
    const cart = data[0] as
      | { total?: unknown; credit_line_total?: unknown; credit_lines?: CreditLineRow[] | null }
      | undefined
    if (!cart) return
    const credits = giftCardCredits(cart.credit_lines)
    const plan = giftCardCreditPlan({
      totalWithCredits: amountOf(cart.total),
      creditLineTotal: amountOf(cart.credit_line_total),
      credits,
    })
    if (plan.action === "keep") return

    const carts = container.resolve<CartCreditLines>(Modules.CART)
    await carts.deleteCreditLines(plan.removeIds)
    if (plan.action === "cap") {
      await carts.createCreditLines([
        {
          cart_id: cartId,
          amount: plan.amount,
          reference: plan.line.reference ?? null,
          reference_id: plan.line.reference_id ?? null,
          metadata: plan.line.metadata ?? null,
        },
      ])
      logger.info(`Cart ${cartId}: gift card credit capped to ${plan.amount}, what is left to pay.`)
    } else {
      logger.info(`Cart ${cartId}: gift card credit removed, nothing is left to pay.`)
    }
  } catch (error) {
    logger.error(
      `Cart ${cartId}: could not keep the gift card credit within the total. ${
        error instanceof Error ? error.message : String(error)
      } The completion checks the card again.`
    )
  }
}
