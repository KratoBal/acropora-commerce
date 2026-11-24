import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { LOYALTY_MODULE } from "../../../modules/loyalty"
import type LoyaltyModuleService from "../../../modules/loyalty/service"
import { accrualPoints, loadLoyaltyAccrualSettings, type AccrualOrder } from "./loyalty-accrual"
import { loadLoyaltySettings } from "./loyalty-settings"

type Container = { resolve: <T = unknown>(key: string) => T }
type Logger = { info: (message: string) => void; warn: (message: string) => void; error: (message: string) => void }

export type AccrualOutcome =
  | { status: "off" }
  | { status: "no_customer" }
  | { status: "nothing_earned" }
  | { status: "credited"; points: number; repeated: boolean }
  | { status: "failed"; message: string }

/**
 * CREDITS THE POINTS AN ORDER EARNED, called when its business status becomes "Megrendelés lezárva" (card dfb79916). NEVER
 * THROWS: the status change has already happened and stands; a failure is logged with the order, the customer and the points,
 * so they can be credited by hand (the OS has the manual credit), and the answer says `failed`. A second call for the same order
 * stores nothing (the ledger's key is the order), so a repeated move or a retry is safe.
 */
export async function creditOrderLoyaltyAccrual(container: Container, orderId: string): Promise<AccrualOutcome> {
  let logger: Logger | undefined
  try {
    logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  } catch {
    logger = undefined
  }
  let customerId: string | null = null
  let points = 0
  try {
    const { settings } = await loadLoyaltyAccrualSettings(container)
    if (!settings.enabled) return { status: "off" }

    const query = container.resolve<{
      graph: (input: { entity: string; fields: string[]; filters: Record<string, unknown> }) => Promise<{ data: unknown[] }>
    }>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "total",
        "credit_line_total",
        "items.total",
        "items.unit_price",
        "items.compare_at_unit_price",
      ],
      filters: { id: orderId },
    })
    const order = data[0] as (AccrualOrder & { id: string }) | undefined
    if (!order) throw new Error(`order ${orderId} not found`)
    customerId = order.customer_id ?? null
    if (!customerId) return { status: "no_customer" }

    const redemption = (await loadLoyaltySettings(container)).settings
    points = accrualPoints(order, settings, redemption.value)
    if (points < 1) return { status: "nothing_earned" }

    const loyalty = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
    const result = await loyalty.accruePoints({ customer_id: customerId, order_id: orderId, points })
    logger?.info(
      `Order ${orderId} closed: ${result.points} points credited to customer ${customerId}${result.repeated ? " (already done)" : ""}.`,
    )
    return { status: "credited", points: result.points, repeated: result.repeated }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger?.error(
      `Order ${orderId} closed, but its points (${points}, customer ${customerId ?? "?"}) could not be credited: ${message}. Credit them by hand.`,
    )
    return { status: "failed", message }
  }
}
