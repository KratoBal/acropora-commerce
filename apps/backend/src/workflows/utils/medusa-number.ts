import { MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * A QUANTITY OR AN AMOUNT FROM `query.graph`, AS A PLAIN NUMBER.
 *
 * Measured on the test shop (2026-10-06, a split of order #50): the loader's
 * `Number(item.quantity)` was NaN. The split went on with it, the remaining
 * quantity reached Medusa as null ("Quantity of item ... is required"), and
 * the moved line's price was null as well. Medusa's own workflows never read
 * these values with `Number()`; they go through `MathBN`, which takes a
 * number, a numeric string, a BigNumber or its raw `{ value, precision }`
 * record (raw record: `Number()` NaN, `MathBN` the value, measured).
 *
 * A missing value throws instead of counting as 0: `MathBN.convert(undefined)`
 * is a silent 0, and a quantity of 0 would plan a wrong split just as quietly.
 */
export const medusaNumber = (value: unknown, what: string): number => {
  if (value === undefined || value === null) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `${what} was not loaded`)
  }
  const converted = MathBN.convert(value as Parameters<typeof MathBN.convert>[0])
  if (!converted.isFinite()) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `${what} is not a number`)
  }
  return converted.toNumber()
}
