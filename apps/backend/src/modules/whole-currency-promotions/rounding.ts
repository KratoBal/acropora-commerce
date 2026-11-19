import { BigNumber, defaultCurrencies, MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * A DISCOUNT IN WHOLE CURRENCY UNITS. Medusa's promotion module computes each adjustment by plain multiplication, with
 * no currency precision (`@medusajs/promotion` 2.22.4, `utils/compute-actions/line-items.js`): a 15% coupon on a
 * 29 990 Ft line is 4 498,5 Ft, and the order total, the Stripe charge (x100: 2 664 150 fillér) and the invoice follow
 * it, while the customer's e-mail writes the total rounded (measured on the test shop, acrobot 56524 and 56528).
 *
 * The adjustments the module proposes are rounded here to the currency's own decimal digits (forint: 0), ONE CODE AT A
 * TIME, by the largest remainder: the code's whole discount is its exact total rounded half up, and the lines get their
 * amounts rounded down plus one unit each for the lines with the largest fractions until the whole is reached. Rounding
 * each line alone would let a 1 000 Ft coupon spread over three lines come to 333 + 333 + 333 = 999 Ft in the checkout
 * (barracuda, #807). A currency Medusa does not know is left as it is.
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

type ComputedAction = { action?: string; amount?: unknown; code?: string }

const currencyDigits = (currencyCode: string | undefined) =>
  currencyCode ? defaultCurrencies[currencyCode.toUpperCase()]?.decimal_digits : undefined

/**
 * The adjustments rounded per code (item and shipping adjustments apart), every other action (a removal, a skipped code)
 * untouched. Each code's lines add up to its exact total rounded half up; the lines with the largest fractions take the
 * units the rounding-down left over, the earlier line first on a tie.
 */
export function roundAdjustmentActions<T>(actions: T, currencyCode: string | undefined): T {
  if (!Array.isArray(actions)) return actions
  const digits = currencyDigits(currencyCode)
  if (digits === undefined) return actions
  const multiplier = Math.pow(10, digits)
  const out = [...actions] as ComputedAction[]
  const groups = new Map<string, number[]>()
  out.forEach((action, index) => {
    if (!action || !ADJUSTMENT_ACTIONS.has(action.action ?? "") || !("amount" in action)) return
    if (action.amount === null || action.amount === undefined) return
    const key = `${action.action}|${action.code ?? ""}`
    groups.set(key, [...(groups.get(key) ?? []), index])
  })
  for (const indices of groups.values()) {
    const amounts = indices.map((i) => out[i]!.amount as number)
    // exact multiplication, as smallest-unit.ts: plain floating point gives 9.995 x 100 = 999.4999...
    const scaled = amounts.map((amount) => new BigNumber(MathBN.mult(amount, multiplier)).numeric)
    const whole = Math.round(
      new BigNumber(MathBN.mult(MathBN.add(...amounts), multiplier)).numeric
    )
    const units = scaled.map((value) => Math.floor(value))
    let left = whole - units.reduce((sum, value) => sum + value, 0)
    const byFraction = scaled
      .map((value, at) => ({ at, fraction: value - units[at]! }))
      .sort((a, b) => b.fraction - a.fraction || a.at - b.at)
    for (const { at } of byFraction) {
      if (left <= 0) break
      units[at]! += 1
      left -= 1
    }
    indices.forEach((i, at) => {
      out[i] = { ...out[i]!, amount: units[at]! / multiplier }
    })
  }
  return out as T
}

const INSTALLED = Symbol.for("acropora.wholeCurrencyPromotions")

type PromotionServiceClass = {
  prototype: { computeActions: (...args: unknown[]) => Promise<unknown>; [INSTALLED]?: true }
}

/**
 * Wraps the promotion service's `computeActions` once: the module's own result, with its adjustments rounded to the
 * currency of the context it was computed for (the cart or the order). Returns false when it was already wrapped.
 */
export function installWholeCurrencyRounding(
  service: PromotionServiceClass,
  onMissingCurrency: () => void = () => undefined
): boolean {
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
    // the rounding rests on the context's currency (computeActions' second argument): if an upgrade moves it, say so
    // instead of leaving the fractions in silently (barracuda, #807)
    if (!context?.currency_code) onMissingCurrency()
    return roundAdjustmentActions(await original.apply(this, args), context?.currency_code)
  }
  prototype[INSTALLED] = true
  return true
}
