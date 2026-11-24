import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { amountOf, giftCardCredits, type CreditLineRow } from "./gift-card-credit"
import { loyaltyCreditPlan, loyaltyCredits } from "./loyalty/loyalty-credit"
import { loadLoyaltySettings } from "./loyalty/loyalty-settings"

type Container = { resolve: <T = unknown>(key: string) => T }

type CartCreditLines = {
  deleteCreditLines(ids: string[]): Promise<void>
  createCreditLines(
    data: {
      cart_id: string
      amount: number
      reference: string | null
      reference_id: string | null
      metadata: Record<string, unknown> | null
    }[],
  ): Promise<unknown>
}

/**
 * KEEPS A CART'S POINTS CREDIT WITHIN WHAT THE CART STILL QUALIFIES FOR (card dfb79916). The twin of
 * `capGiftCardCredit`: it runs in every cart refresh, only lowers (a cart that got dearer keeps its credit; the customer
 * redeems again to use more), and NEVER THROWS, because every cart operation passes here. What it cannot repair it logs;
 * the completion hook checks again before taking anything. Points are whole, so a cap rounds down; a cart that fell
 * under the order minimum, or whose share fell under the minimum points, loses the credit.
 */
export async function capLoyaltyCredit(cartId: string, container: Container, logger: Logger): Promise<void> {
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
    const credits = loyaltyCredits(cart.credit_lines)
    if (!credits.length) return
    const settings = (await loadLoyaltySettings(container)).settings
    const plan = loyaltyCreditPlan({
      totalWithCredits: amountOf(cart.total),
      creditLineTotal: amountOf(cart.credit_line_total),
      otherCredits: giftCardCredits(cart.credit_lines).reduce((sum, line) => sum + amountOf(line.amount), 0),
      credits,
      settings,
    })
    if (plan.action === "keep") return

    const carts = container.resolve<CartCreditLines>(Modules.CART)
    await carts.deleteCreditLines(plan.removeIds)
    if (plan.action === "cap") {
      await carts.createCreditLines([
        {
          cart_id: cartId,
          amount: plan.points * settings.value,
          reference: plan.line.reference ?? null,
          reference_id: plan.line.reference_id ?? null,
          metadata: { ...(plan.line.metadata ?? {}), points: plan.points },
        },
      ])
      logger.info(`Cart ${cartId}: points credit capped to ${plan.points} points, what the cart still takes.`)
    } else {
      logger.info(`Cart ${cartId}: points credit removed, the cart no longer qualifies.`)
    }
  } catch (error) {
    logger.error(
      `Cart ${cartId}: could not keep the points credit within the cart. ${
        error instanceof Error ? error.message : String(error)
      } The completion checks again.`,
    )
  }
}
