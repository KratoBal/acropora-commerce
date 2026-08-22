/**
 * Cart-wide shipping decision, collapsed to a single scalar.
 *
 * Medusa evaluates shipping-option rules by reading one value out of the
 * context and comparing it as a string, and an attribute that resolves to an
 * array is flattened into a comma-joined string
 * (`@medusajs/fulfillment/dist/utils/utils.js`, `isContextValid`). "Any item in
 * the cart" logic therefore cannot be expressed as a rule: it silently returns
 * false for multi-item carts while looking correct for single-item ones. The
 * precedence lives here, in plain code, and the rules only compare one scalar.
 */

/** Weight is stored and compared in GRAMS. 20 kg is the business threshold. */
export const HEAVY_WEIGHT_THRESHOLD_GRAMS = 20_000

export const SHIPPING_CLASSES = [
  "PICKUP_ONLY",
  "HEAVY",
  "NO_FOXPOST",
  "NORMAL",
] as const

export type ShippingClass = (typeof SHIPPING_CLASSES)[number]

/**
 * One cart line, already normalized. This function never queries Medusa: the
 * caller resolves the flags and hands them over, so the decision stays pure and
 * testable.
 */
export type ShippingRelevantItem = {
  /** Only used to report which line caused the decision. */
  line_item_id?: string | null

  /** Explicitly marked pickup-only, for example because of its dimensions. */
  pickup_only?: boolean | null

  /** Frozen goods cannot be shipped. */
  is_frozen?: boolean | null

  /**
   * Corals, fish and other livestock. Passed in explicitly and never inferred
   * from product names.
   */
  is_livestock?: boolean | null

  /** Must not be sent to a Foxpost parcel point. */
  foxpost_forbidden?: boolean | null

  /** Unit weight of a single variant, in GRAMS. */
  weight?: number | null

  /**
   * Lines that do not require shipping cannot make a cart heavy or
   * pickup-only. Medusa's own completion check filters the same way
   * (`@medusajs/core-flows/dist/cart/steps/validate-shipping.js`). Defaults to
   * true, matching the line-item column default.
   */
  requires_shipping?: boolean | null
}

export type ShippingClassResult = {
  shipping_class: ShippingClass
  /**
   * The line that decided the class, or null for NORMAL. Not used by any rule;
   * it exists so the storefront can say WHY an option disappeared.
   */
  shipping_class_source: string | null
}

const isShippable = (item: ShippingRelevantItem) =>
  item.requires_shipping !== false

const forcesPickup = (item: ShippingRelevantItem) =>
  item.pickup_only === true ||
  item.is_frozen === true ||
  item.is_livestock === true

/**
 * Strictly greater than the threshold. Exactly 20,000 g is NOT heavy.
 * A missing, null or non-finite weight is never heavy: absent data is not a
 * restriction.
 */
const isHeavy = (item: ShippingRelevantItem) =>
  typeof item.weight === "number" &&
  Number.isFinite(item.weight) &&
  item.weight > HEAVY_WEIGHT_THRESHOLD_GRAMS

const forbidsFoxpost = (item: ShippingRelevantItem) =>
  item.foxpost_forbidden === true

const sourceOf = (item: ShippingRelevantItem) => item.line_item_id ?? null

/**
 * Precedence: PICKUP_ONLY > HEAVY > NO_FOXPOST > NORMAL.
 * The four classes are mutually exclusive by construction.
 */
export const computeShippingClass = (
  items: ShippingRelevantItem[] | null | undefined
): ShippingClassResult => {
  const shippable = (items ?? []).filter(isShippable)

  const pickup = shippable.find(forcesPickup)
  if (pickup) {
    return { shipping_class: "PICKUP_ONLY", shipping_class_source: sourceOf(pickup) }
  }

  const heavy = shippable.find(isHeavy)
  if (heavy) {
    return { shipping_class: "HEAVY", shipping_class_source: sourceOf(heavy) }
  }

  const noFoxpost = shippable.find(forbidsFoxpost)
  if (noFoxpost) {
    return {
      shipping_class: "NO_FOXPOST",
      shipping_class_source: sourceOf(noFoxpost),
    }
  }

  return { shipping_class: "NORMAL", shipping_class_source: null }
}

export default computeShippingClass
