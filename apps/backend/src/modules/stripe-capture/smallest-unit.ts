import { BigNumber, MathBN } from "@medusajs/framework/utils"

/**
 * AMOUNT -> STRIPE'S SMALLEST UNIT, the same conversion the stock provider uses
 * when it creates the PaymentIntent (`@medusajs/payment-stripe` 2.20.1,
 * dist/utils/get-smallest-unit.js, `getSmallestUnit`). Reproduced here because
 * the package does not export it; a capture in another unit than the intent's
 * would take the wrong amount. HUF is NOT a zero-decimal currency in this
 * table: 1 000 Ft is 100 000.
 */
const ZERO_DECIMAL = [
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]
const THREE_DECIMAL = ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]

/*
  THE SAME ARITHMETIC, NOT JUST THE SAME TABLE: plain floating point gives
  9.995 x 100 = 999.4999..., which rounds to 999, while the package multiplies
  exactly and gets 1000 (measured by the parity test). Hence MathBN, as there.
*/
export const smallestUnit = (amount: number, currency: string): number => {
  const code = currency.toUpperCase()
  const power = ZERO_DECIMAL.includes(code) ? 0 : THREE_DECIMAL.includes(code) ? 3 : 2
  const multiplier = Math.pow(10, power)
  const rounded =
    Math.round(new BigNumber(MathBN.mult(amount, multiplier)).numeric) / multiplier
  let numeric = new BigNumber(MathBN.mult(rounded, multiplier)).numeric
  // the package rounds three-decimal currencies up to the nearest ten
  if (multiplier === 1e3) {
    numeric = Math.ceil(numeric / 10) * 10
  }
  return parseInt(numeric.toString().split(".")[0], 10)
}
