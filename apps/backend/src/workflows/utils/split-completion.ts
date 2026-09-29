import { MedusaError } from "@medusajs/framework/utils"

/**
 * THE SPLIT COMPLETION (P4-2a2): one mixed cart becomes two orders.
 *
 * Balázs, 2026-09-29: a cart with live animals and other items is placed in one
 * step and becomes two orders the customer sees: the shipped one and a pickup
 * one (collected and paid in the shop). The pickup-only lines are chosen by
 * `pickupSplit` (P4-2a1).
 *
 * The order of the steps is the design:
 *
 * 1. The pickup lines move to their own cart, linked both ways in metadata.
 * 2. That cart gets the store pickup and payment in the shop; the shipped cart
 *    keeps the payment the customer chose, re-created because moving lines
 *    changes its total and Medusa then deletes its payment session.
 * 3. The shipped cart is completed FIRST. If that fails, the lines move back
 *    and nothing is left half done: the customer is where they were.
 * 4. Then the pickup cart. If that fails, the shipped order stands; the answer
 *    names the pickup cart as pending, and calling again finishes it.
 * 5. The two orders are linked both ways in metadata.
 *
 * Every step is safe to run again: a second call after any failure picks up
 * from the state it finds, and never makes a third cart or a second order.
 *
 * The Medusa calls sit behind `SplitOperations`, so this order can be tested
 * without a database; the wrappers are in `split-completion-operations.ts`.
 */

export const PICKUP_CART_METADATA_KEY = "acropora_pickup_cart_id"
export const PARENT_CART_METADATA_KEY = "acropora_parent_cart_id"
export const PICKUP_ORDER_METADATA_KEY = "acropora_pickup_order_id"
export const PARENT_ORDER_METADATA_KEY = "acropora_parent_order_id"

export type SplitLine = {
  id: string
  variant_id: string | null
  quantity: number
  metadata?: Record<string, unknown> | null
}

export type SplitCart = {
  id: string
  completed_at: string | Date | null
  /** The order made from this cart, once completed. */
  order_id: string | null
  metadata: Record<string, unknown> | null
  items: SplitLine[]
  /** The provider of the payment session the customer chose, if any. */
  payment_provider_id: string | null
  promo_codes: string[]
  has_shipping_method: boolean
}

export type SplitOperations = {
  loadCart(cartId: string): Promise<SplitCart | null>
  /** The lines that go to the pickup order (`pickupSplit`), by line id. */
  splitLineIds(cartId: string): Promise<string[]>
  /** A new cart like `from` (customer, region, addresses), linked both ways. */
  createPickupCart(from: SplitCart): Promise<string>
  addLines(cartId: string, lines: SplitLine[]): Promise<void>
  deleteLines(cartId: string, lineIds: string[]): Promise<void>
  /** Applies the codes that are valid on the cart; the others are skipped. */
  applyPromotions(cartId: string, codes: string[]): Promise<void>
  setStorePickup(cartId: string): Promise<void>
  /**
   * The products among these lines that are NOT on the store pickup option's
   * shipping profile, by product id. Medusa refuses to complete a cart whose
   * lines have no matching shipping method; checked before anything moves.
   */
  pickupProfileGaps(lines: SplitLine[]): Promise<string[]>
  /** A payment session with this provider, and its fee lines in line with it. */
  ensurePayment(cartId: string, providerId: string): Promise<void>
  complete(cartId: string): Promise<string>
  linkOrders(parentOrderId: string, pickupOrderId: string): Promise<void>
  warn(message: string): void
}

export type SplitResult = {
  /** The shipped order first, then the pickup order. */
  order_ids: string[]
  /** Set when the shipped order exists but the pickup order does not yet. */
  pending_pickup_cart_id: string | null
}

const pickupCartIdOf = (cart: SplitCart): string | null => {
  const id = cart.metadata?.[PICKUP_CART_METADATA_KEY]
  return typeof id === "string" && id ? id : null
}

/** Lines of `from` whose variant is not yet on `to` (a repeated move adds nothing twice). */
const linesMissingOn = (lines: SplitLine[], to: SplitCart): SplitLine[] => {
  const present = new Set(to.items.map((line) => line.variant_id))
  return lines.filter((line) => !present.has(line.variant_id))
}

const mustLoad = async (ops: SplitOperations, cartId: string) => {
  const cart = await ops.loadCart(cartId)

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id ${cartId} was not found`
    )
  }

  return cart
}

const finishPickup = async (
  ops: SplitOperations,
  parentOrderId: string,
  pickupCartId: string,
  payAtStoreProviderId: string
): Promise<SplitResult> => {
  try {
    await ops.ensurePayment(pickupCartId, payAtStoreProviderId)
    const pickupOrderId = await ops.complete(pickupCartId)
    await ops.linkOrders(parentOrderId, pickupOrderId)
    return { order_ids: [parentOrderId, pickupOrderId], pending_pickup_cart_id: null }
  } catch (error) {
    ops.warn(
      `Split completion: the shipped order ${parentOrderId} exists, the pickup cart ${pickupCartId} is not completed yet: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return { order_ids: [parentOrderId], pending_pickup_cart_id: pickupCartId }
  }
}

export const completeSplitCart = async (
  cartId: string,
  ops: SplitOperations,
  config: { payAtStoreProviderId: string }
): Promise<SplitResult> => {
  const cart = await mustLoad(ops, cartId)
  const pickupCartId = pickupCartIdOf(cart)

  // A REPEATED CALL after the shipped order was made: only the pickup part is
  // left, if anything.
  if (cart.completed_at) {
    if (!cart.order_id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cart ${cartId} is completed but has no order`
      )
    }
    if (!pickupCartId) {
      return { order_ids: [cart.order_id], pending_pickup_cart_id: null }
    }
    const pickup = await mustLoad(ops, pickupCartId)
    if (pickup.completed_at && pickup.order_id) {
      await ops.linkOrders(cart.order_id, pickup.order_id)
      return {
        order_ids: [cart.order_id, pickup.order_id],
        pending_pickup_cart_id: null,
      }
    }
    return finishPickup(ops, cart.order_id, pickupCartId, config.payAtStoreProviderId)
  }

  const splitIds = new Set(await ops.splitLineIds(cartId))
  const pickupLines = cart.items.filter((line) => splitIds.has(line.id))

  // NOTHING TO SPLIT, and no earlier split waiting: an ordinary completion.
  if (!pickupLines.length && !pickupCartId) {
    return {
      order_ids: [await ops.complete(cartId)],
      pending_pickup_cart_id: null,
    }
  }

  // The customer's payment choice is read from the cart, never sent by the
  // client: the shipped cart keeps what was chosen at checkout.
  const providerId = cart.payment_provider_id

  if (!providerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "No payment method is selected for the shipped part"
    )
  }

  // Checked before anything moves: without payment in the shop the pickup
  // order could never be completed, and the lines would sit split.
  if (!config.payAtStoreProviderId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Payment in the shop is not configured, so the pickup order cannot be made"
    )
  }

  // THE PICKUP ORDER MUST BE POSSIBLE BEFORE THE FIRST ORDER IS MADE (measured
  // on stage, 2026-09-29: a pickup product without a shipping profile let the
  // shipped order through and left the pickup cart pending). A gap known in
  // advance now refuses the placement with nothing moved.
  const gaps = pickupLines.length ? await ops.pickupProfileGaps(pickupLines) : []

  if (gaps.length) {
    ops.warn(
      `Split completion refused for ${cartId}: not on the store pickup's shipping profile: ${gaps.join(", ")}`
    )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Some pickup items cannot be collected in the shop yet, so the order was not placed"
    )
  }

  const pickupId = pickupCartId ?? (await ops.createPickupCart(cart))
  const pickup = await mustLoad(ops, pickupId)

  if (pickupLines.length) {
    await ops.addLines(pickupId, linesMissingOn(pickupLines, pickup))
    await ops.deleteLines(
      cartId,
      pickupLines.map((line) => line.id)
    )
  }

  if (cart.promo_codes.length) {
    await ops.applyPromotions(pickupId, cart.promo_codes)
  }
  if (!pickup.has_shipping_method) {
    await ops.setStorePickup(pickupId)
  }
  await ops.ensurePayment(cartId, providerId)

  let parentOrderId: string

  try {
    parentOrderId = await ops.complete(cartId)
  } catch (error) {
    // Back to where the customer was: the pickup lines return to the cart
    // they chose them in. The emptied pickup cart stays linked and is reused
    // by the next attempt.
    const now = await mustLoad(ops, pickupId)
    const main = await mustLoad(ops, cartId)
    await ops.addLines(cartId, linesMissingOn(now.items, main))
    await ops.deleteLines(
      pickupId,
      now.items.map((line) => line.id)
    )
    throw error
  }

  return finishPickup(ops, parentOrderId, pickupId, config.payAtStoreProviderId)
}

/**
 * The products whose shipping profile is not the store pickup's, from the
 * variant rows of the pickup lines. A variant without a product row, or a
 * product without a profile, is a gap too: Medusa would refuse it the same way.
 */
export const shippingProfileGaps = (
  variants: {
    id: string
    product?: { id?: string | null; shipping_profile?: { id?: string | null } | null } | null
  }[],
  variantIds: (string | null)[],
  pickupProfileId: string | null
): string[] => {
  const byId = new Map(variants.map((variant) => [variant.id, variant]))
  const gaps = new Set<string>()

  for (const variantId of variantIds) {
    const variant = variantId ? byId.get(variantId) : undefined

    if (
      !pickupProfileId ||
      !variant ||
      variant.product?.shipping_profile?.id !== pickupProfileId
    ) {
      // The product when known; otherwise the variant, so the log still says
      // which line it was.
      gaps.add(variant?.product?.id ?? `variant ${variantId ?? "(none)"}`)
    }
  }

  return Array.from(gaps)
}

