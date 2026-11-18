import { BigNumber, defaultCurrencies, MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * A DISCOUNT IN WHOLE CURRENCY UNITS. Medusa's promotion module computes each adjustment by plain multiplication, with
 * no currency precision (`@medusajs/promotion` 2.22.4, `utils/compute-actions/line-items.js`): a 15% coupon on a
 * 29 990 Ft line is 4 498,5 Ft, and the order total, the Stripe charge (x100: 2 664 150 fillér) and the invoice follow
 * it, while the customer's e-mail writes the total rounded (measured on the test shop, acrobot 56524 and 56528).
 *
 * The amount of every adjustment the module proposes is rounded here to the currency's own decimal digits (forint: 0),
 * half up, line by line: each line's discount is off its exact percentage by half a unit at most. A currency Medusa does
 * not know is left as it is.
 */

const ADJUSTMENT_ACTIONS = new Set(["addItemAdjustment", "addShippingMethodAdjustment"])

export function roundToCurrency(amount: unknown, currencyCode: string | undefined): unknown {
  const digits = currencyCode
    ? defaultCurrencies[currencyCode.toUpperCase()]?.decimal_digits
    : undefined
  if (digits === undefined || amount === null || amount === undefined) return amount
  const multiplier = Math.pow(10, digits)
  // exact multiplication, as smallest-unit.ts: plain floating point gives 9.995 x 100 = 999.4999...
  const scaled = new BigNumber(MathBN.mult(amount as number, multiplier)).numeric
  return Math.round(scaled) / multiplier
}

type ComputedAction = { action?: string; amount?: unknown }

/** The adjustments rounded, every other action (a removal, a skipped code) untouched. */
export function roundAdjustmentActions<T>(actions: T, currencyCode: string | undefined): T {
  if (!Array.isArray(actions)) return actions
  return actions.map((action: ComputedAction) =>
    action && ADJUSTMENT_ACTIONS.has(action.action ?? "") && "amount" in action
      ? { ...action, amount: roundToCurrency(action.amount, currencyCode) }
      : action
  ) as T
}

const INSTALLED = Symbol.for("acropora.wholeCurrencyPromotions")

type PromotionServiceClass = {
  prototype: { computeActions: (...args: unknown[]) => Promise<unknown>; [INSTALLED]?: true }
}

/**
 * Wraps the promotion service's `computeActions` once: the module's own result, with its adjustments rounded to the
 * currency of the context it was computed for (the cart or the order). Returns false when it was already wrapped.
 */
export function installWholeCurrencyRounding(service: PromotionServiceClass): boolean {
  const prototype = service.prototype
  if (prototype[INSTALLED]) return false
  const original = prototype.computeActions
  if (typeof original !== "function")
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "whole-currency-promotions: the promotion service has no computeActions to wrap"
    )
  prototype.computeActions = async function (this: unknown, ...args: unknown[]) {
    const context = args[1] as { currency_code?: string } | undefined
    return roundAdjustmentActions(await original.apply(this, args), context?.currency_code)
  }
  prototype[INSTALLED] = true
  return true
}
