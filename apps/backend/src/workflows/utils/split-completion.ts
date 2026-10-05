import { MedusaError } from "@medusajs/framework/utils"
import {
  STRIPE_JOINED_KEY,
  STRIPE_JOINT_KEY,
  STRIPE_SHARE_KEY,
} from "../../modules/stripe-capture/share"

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

/**
 * THE ÁSZF ACCEPTANCE TRAVELS TO THE PICKUP CART (card 4a2b252d; barracuda's
 * measurement, 5371). The storefront writes it on the cart before the payment
 * starts (`aszf_elfogadas`: time, version, document, the same record as at
 * registration). Medusa copies a cart's metadata onto its order
 * (`completeCartWorkflow`, core-flows 2.20.1 complete-cart.js:454), so the
 * shipped order has it; the pickup cart is created here, and got only its
 * parent's id, so the live-animal order was placed without the record.
 */
export const ASZF_METADATA_KEY = "aszf_elfogadas"

/** The pickup cart's metadata: its parent, and the parent's ÁSZF acceptance if there is one. */
export const pickupCartMetadata = (
  parentId: string,
  parentMetadata: Record<string, unknown> | null | undefined
): Record<string, unknown> => ({
  [PARENT_CART_METADATA_KEY]: parentId,
  ...(parentMetadata?.[ASZF_METADATA_KEY] !== undefined
    ? { [ASZF_METADATA_KEY]: parentMetadata[ASZF_METADATA_KEY] }
    : {}),
})

/**
 * The code in the refusal's message when the split would change the discount;
 * the storefront shows the customer what to do on it.
 */
export const SPLIT_DISCOUNT_CHANGED = "split_discount_changed"

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
  /**
   * The cart's promotion codes that also go on the pickup cart
   * (`pickupPromoCodes`); the shipped cart keeps all of its own.
   */
  pickup_promo_codes: string[]
  has_shipping_method: boolean
  /**
   * The cart's payment is a Stripe PaymentIntent shared with the other cart of
   * the split (P4-3c): the lines were split before the payment started.
   */
  shared_payment: boolean
}

/** A promotion on the cart, as far as the split needs it. */
export type CartPromotion = {
  code: string | null
  /** `application_method.type`: "percentage" or "fixed". */
  type: string | null
  /** `application_method.allocation`: "each" (per item) or "across" (the whole target once). */
  allocation: string | null
}

/**
 * THE CODES THAT MAY GO ON THE PICKUP CART TOO: only those that divide with the
 * lines, so the two orders together get what the one cart would have got.
 *
 * Measured on stage, 2026-09-29, with the same lines in one cart and split in
 * two: a 10% code gave 950 Ft whole and 100 + 850 split. A fixed cart-level
 * code (fixed, across) gave 635 Ft whole and 635 on EACH part: applied to
 * both carts, it is taken twice. A fixed per-item code (each) divides like a
 * percentage one. So a fixed "across" code stays on the shipped cart only.
 */
export const pickupPromoCodes = (promotions: CartPromotion[]): string[] =>
  promotions
    .filter((promotion) => promotion.type === "percentage" || promotion.allocation === "each")
    .map((promotion) => promotion.code)
    .filter((code): code is string => typeof code === "string" && code.length > 0)

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
  /** The cart's discount total, as Medusa computes it now. */
  discountTotal(cartId: string): Promise<number>
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
  /**
   * Runs `job` alone for this cart: a second call waits for the first and
   * finds the state it left (`SPLIT_LOCK_KEY`).
   */
  withLock<T>(cartId: string, job: () => Promise<T>): Promise<T>
}

/**
 * ONE SPLIT AT A TIME PER CART. A double click on "place order" or "pay", or
 * the order-placed subscriber running while the storefront completes the
 * split, would otherwise run two splits of the same cart at once: both find no pickup
 * cart, both create one, and the lines end up spread over three carts.
 * Medusa's own completion locks the cart id itself; the moves around it are
 * ours, so they take their own key (a different one: holding the cart id
 * here would block Medusa's completion inside it).
 */
export const SPLIT_LOCK_KEY = (cartId: string) => `split:${cartId}`

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

/**
 * The pickup cart's payment: the shared PaymentIntent when the split was
 * paid together (P4-3c), otherwise payment in the shop.
 */
const pickupProviderOf = (pickup: SplitCart, payAtStoreProviderId: string) =>
  pickup.shared_payment && pickup.payment_provider_id
    ? pickup.payment_provider_id
    : payAtStoreProviderId

const finishPickup = async (
  ops: SplitOperations,
  parentOrderId: string,
  pickupCartId: string,
  payAtStoreProviderId: string
): Promise<SplitResult> => {
  try {
    const pickup = await mustLoad(ops, pickupCartId)
    await ops.ensurePayment(pickupCartId, pickupProviderOf(pickup, payAtStoreProviderId))
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

export type SplitCompletionConfig = {
  payAtStoreProviderId: string
  /**
   * The online card providers (`ACROPORA_PP_ONLINE_CARD`). A card payment is
   * confirmed before completion; the split below re-creates the shipped cart's
   * session, which would discard it. A card pays a split only together, started
   * split (the PAID TOGETHER branch).
   */
  onlineCardProviderIds: readonly string[]
}

export const completeSplitCart = (
  cartId: string,
  ops: SplitOperations,
  config: SplitCompletionConfig
): Promise<SplitResult> => ops.withLock(cartId, () => completeSplitCartLocked(cartId, ops, config))

const completeSplitCartLocked = async (
  cartId: string,
  ops: SplitOperations,
  config: SplitCompletionConfig
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

  // PAID TOGETHER (P4-3c): the lines were split before the payment started,
  // and one PaymentIntent covers both carts. Nothing moves now, and a failure
  // moves nothing back: the payment belongs to these two carts as they are,
  // and the next call completes them.
  if (cart.shared_payment && providerId) {
    if (pickupLines.length || !pickupCartId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The cart changed after its shared payment started, so it was not placed"
      )
    }
    await ops.ensurePayment(cartId, providerId)
    const parentOrderId = await ops.complete(cartId)
    return finishPickup(ops, parentOrderId, pickupCartId, config.payAtStoreProviderId)
  }

  if (!providerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "No payment method is selected for the shipped part"
    )
  }

  // Checked before anything moves (see SplitCompletionConfig): a card chosen for
  // the whole cart cannot survive the split.
  if (config.onlineCardProviderIds.includes(providerId)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A card payment for a cart with pickup-only items starts split; this one was not"
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

  const pickupId = await moveToPickupCart(ops, cart, pickupLines, pickupCartId)
  await ops.ensurePayment(cartId, providerId)

  let parentOrderId: string

  try {
    parentOrderId = await ops.complete(cartId)
  } catch (error) {
    await movePickupLinesBack(ops, cartId, pickupId)
    throw error
  }

  return finishPickup(ops, parentOrderId, pickupId, config.payAtStoreProviderId)
}

/**
 * Steps 1 and 2: the pickup lines to their own cart, with the dividing codes
 * and the store pickup. Used by the completion and by the shared card payment
 * (P4-3c), which splits before the payment starts.
 */
const moveToPickupCart = async (
  ops: SplitOperations,
  cart: SplitCart,
  pickupLines: SplitLine[],
  pickupCartId: string | null
): Promise<string> => {
  // THE PICKUP ORDER MUST BE POSSIBLE BEFORE THE FIRST ORDER IS MADE (measured
  // on stage, 2026-09-29: a pickup product without a shipping profile let the
  // shipped order through and left the pickup cart pending). A gap known in
  // advance now refuses the placement with nothing moved.
  const gaps = pickupLines.length ? await ops.pickupProfileGaps(pickupLines) : []

  if (gaps.length) {
    ops.warn(
      `Split completion refused for ${cart.id}: not on the store pickup's shipping profile: ${gaps.join(", ")}`
    )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Some pickup items cannot be collected in the shop yet, so the order was not placed"
    )
  }

  // THE DISCOUNT MAY NOT CHANGE BY SPLITTING (acrobot's decision, 2026-09-29,
  // after measuring on stage): Medusa computes promotions per cart, so an
  // automatic cart-level promotion lands on BOTH carts, and a code whose rule
  // only the whole cart meets (a minimum, or a target on the pickup items)
  // lands on neither. Measured before and after the move; on a difference the
  // lines go back and the placement stops.
  //
  // NOTE FOR WHOEVER ADDS AN AUTOMATIC PROMOTION: an automatic fixed
  // cart-level promotion changes the discount of EVERY mixed cart, so every
  // mixed cart would be refused here. Stage has none today
  // (measured 2026-09-29).
  const discountBefore = pickupLines.length ? await ops.discountTotal(cart.id) : null

  const pickupId = pickupCartId ?? (await ops.createPickupCart(cart))
  const pickup = await mustLoad(ops, pickupId)

  if (pickupLines.length) {
    await ops.addLines(pickupId, linesMissingOn(pickupLines, pickup))
    await ops.deleteLines(
      cart.id,
      pickupLines.map((line) => line.id)
    )
  }

  if (cart.pickup_promo_codes.length) {
    await ops.applyPromotions(pickupId, cart.pickup_promo_codes)
  }
  if (!pickup.has_shipping_method) {
    await ops.setStorePickup(pickupId)
  }

  if (discountBefore !== null) {
    const discountAfter = (await ops.discountTotal(cart.id)) + (await ops.discountTotal(pickupId))

    // Under 1 Ft is the rounding of two carts, not a different discount.
    if (Math.abs(discountAfter - discountBefore) >= 1) {
      ops.warn(
        `Split refused for ${cart.id}: the discount would be ${discountAfter} split, ${discountBefore} whole`
      )
      await movePickupLinesBack(ops, cart.id, pickupId)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `${SPLIT_DISCOUNT_CHANGED}: the discount changes when this cart is split into two orders, so nothing was placed`
      )
    }
  }

  return pickupId
}

/**
 * Back to where the customer was: the pickup lines return to the cart they
 * chose them in. The emptied pickup cart stays linked and is reused by the
 * next attempt.
 */
export const movePickupLinesBack = async (
  ops: SplitOperations,
  cartId: string,
  pickupId: string
) => {
  const now = await mustLoad(ops, pickupId)
  const main = await mustLoad(ops, cartId)
  await ops.addLines(cartId, linesMissingOn(now.items, main))
  await ops.deleteLines(
    pickupId,
    now.items.map((line) => line.id)
  )
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

    // An unknown pickup profile (null) differs from every real profile id, so
    // it needs no clause of its own: every line is then a gap (measured by the
    // calibration, where a separate clause changed nothing).
    if (!variant || variant.product?.shipping_profile?.id !== pickupProfileId) {
      // The product when known; otherwise the variant, so the log still says
      // which line it was.
      gaps.add(variant?.product?.id ?? `variant ${variantId ?? "(none)"}`)
    }
  }

  return Array.from(gaps)
}


export type SharedPaymentOperations = SplitOperations & {
  /** The cart's total, as Medusa computes it now. */
  cartTotal(cartId: string): Promise<number>
  /**
   * A new payment session with this data; the provider's facts it got, read
   * from the session data under `factsKey`.
   */
  startPayment(
    cartId: string,
    providerId: string,
    data: Record<string, unknown>,
    factsKey: string
  ): Promise<Record<string, unknown>>
  /** Removes the cash-on-delivery fee lines, if any: a card payment owes none. */
  dropCashOnDeliveryFee(cartId: string): Promise<void>
  /** Deletes the cart's payment sessions (the customer is changing method). */
  clearPayment(cartId: string): Promise<void>
}

export type SharedPaymentStart = {
  /** The joint intent's client secret, to confirm the card with. */
  client_secret?: string | null
  total: number
  shipped_total: number
  pickup_total: number
  pickup_cart_id: string | null
}

/**
 * HOW THE CARD PROVIDER SHARES ONE PAYMENT BETWEEN A SPLIT'S TWO CARTS: where
 * its facts are on the session data, and the data that starts the shared
 * payment on the shipped cart (`joint`) and joins it from the pickup cart
 * (`joined`). Stripe, the only card provider (Balázs, 2026-10-05).
 */
export type CardShare = {
  factsKey: string
  joint: (total: number) => Record<string, unknown>
  joined: (facts: Record<string, unknown>) => Record<string, unknown>
}

export const STRIPE_SHARE: CardShare = {
  factsKey: STRIPE_SHARE_KEY,
  // card only: the storefront's deferred card field asks for card alone
  joint: (total) => ({ [STRIPE_JOINT_KEY]: { total }, payment_method_types: ["card"] }),
  joined: (facts) => ({ [STRIPE_JOINED_KEY]: facts }),
}

export type CardStartConfig = {
  providerId: string
  share: CardShare
  /** `false`: a cart that would be split is refused (the Stripe lock). */
  allowSplit?: boolean
}

/**
 * THE CARD PAYMENT STARTS HERE (P4-3c): a cart that is not split gets one
 * PaymentIntent for itself; a mixed cart is split first (below).
 *
 * The cash-on-delivery fee goes first, so a customer who switched from cash on
 * delivery is not charged it by card, and the intent's amount is final.
 *
 * ONE CARD PAYMENT FOR BOTH ORDERS OF A MIXED CART (P4-3c, variant B).
 *
 * The lines are split BEFORE the payment starts, so the intent is for the two
 * finished carts together and the money cannot differ from the two orders'
 * sum. The shipped cart's session starts it (`stripe_joint`), the pickup
 * cart's session carries it (`stripe_joined`); both keys are set here only,
 * never by the client.
 *
 * If anything fails before the card is confirmed, the lines move back and the
 * cart is whole again. Called again (a second click, or after a failed card),
 * it reuses the split and starts a new intent.
 */
export const startCardPayment = (
  cartId: string,
  ops: SharedPaymentOperations,
  config: CardStartConfig
): Promise<SharedPaymentStart> =>
  ops.withLock(cartId, () => startCardPaymentLocked(cartId, ops, config))

const startCardPaymentLocked = async (
  cartId: string,
  ops: SharedPaymentOperations,
  config: CardStartConfig
): Promise<SharedPaymentStart> => {
  const share = config.share

  if (!config.providerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Card payment is not configured")
  }

  const cart = await mustLoad(ops, cartId)

  if (cart.completed_at) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Cart ${cartId} is already completed`)
  }

  const pickupCartId = pickupCartIdOf(cart)
  const splitIds = new Set(await ops.splitLineIds(cartId))
  const pickupLines = cart.items.filter((line) => splitIds.has(line.id))

  // Checked before anything changes (the fee, the lines): a refused split
  // leaves the cart as it was.
  if ((pickupLines.length || pickupCartId) && config.allowSplit === false) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This card payment does not pay a cart with pickup-only items yet"
    )
  }

  await ops.dropCashOnDeliveryFee(cartId)

  // NOT SPLIT: one intent for the cart itself.
  if (!pickupLines.length && !pickupCartId) {
    const total = await ops.cartTotal(cartId)
    const facts = await ops.startPayment(cartId, config.providerId, {}, share.factsKey)
    return {
      ...(typeof facts.clientSecret === "string" ? { client_secret: facts.clientSecret } : {}),
      total,
      shipped_total: total,
      pickup_total: 0,
      pickup_cart_id: null,
    }
  }

  const pickupId = await moveToPickupCart(ops, cart, pickupLines, pickupCartId)

  try {
    const shipped = await ops.cartTotal(cartId)
    const pickup = await ops.cartTotal(pickupId)
    const facts = await ops.startPayment(
      cartId,
      config.providerId,
      share.joint(shipped + pickup),
      share.factsKey
    )
    await ops.startPayment(pickupId, config.providerId, share.joined(facts), share.factsKey)

    return {
      ...(typeof facts.clientSecret === "string" ? { client_secret: facts.clientSecret } : {}),
      total: shipped + pickup,
      shipped_total: shipped,
      pickup_total: pickup,
      pickup_cart_id: pickupId,
    }
  } catch (error) {
    await movePickupLinesBack(ops, cartId, pickupId)
    throw error
  }
}

/**
 * A SHARED CARD PAYMENT THAT DID NOT HAPPEN (P4-3c3): the card was refused or
 * the customer gave up. The lines go back to the cart the customer chose them
 * in, so the cart is whole again, as before the payment started, and both
 * carts' payment sessions are dropped. The shipped session's drop cancels the
 * joint intent (no hold stays on the card); the pickup session only joined,
 * its drop touches nothing.
 *
 * Only for a split whose payment was shared and not completed; anything else
 * is left as it is. Safe to run again.
 */
export const rejoinAndClearSharedSplit = (
  cartId: string,
  ops: SharedPaymentOperations
): Promise<{ rejoined: boolean }> =>
  ops.withLock(cartId, async () => {
    const cart = await mustLoad(ops, cartId)
    const pickupCartId = pickupCartIdOf(cart)
    const { rejoined } = await rejoinSharedSplitLocked(cartId, ops)

    if (rejoined) {
      await ops.clearPayment(cartId)
      if (pickupCartId) {
        await ops.clearPayment(pickupCartId)
      }
    }

    return { rejoined }
  })

const rejoinSharedSplitLocked = async (
  cartId: string,
  ops: SplitOperations
): Promise<{ rejoined: boolean }> => {
  const cart = await mustLoad(ops, cartId)
  const pickupCartId = pickupCartIdOf(cart)

  if (cart.completed_at || !pickupCartId || !cart.shared_payment) {
    return { rejoined: false }
  }

  const pickup = await mustLoad(ops, pickupCartId)

  if (pickup.completed_at) {
    return { rejoined: false }
  }

  await movePickupLinesBack(ops, cartId, pickupCartId)
  return { rejoined: true }
}

/**
 * THE CUSTOMER CHOSE CARD PAYMENT FOR A MIXED CART, before any intent: the
 * cash-on-delivery fee and the earlier payment session go, so the review shows
 * the amount the card will be charged, and nothing is started yet. The intent
 * starts at placement (`startCardPayment`).
 */
export const chooseCardPayment = (cartId: string, ops: SharedPaymentOperations): Promise<void> =>
  ops.withLock(cartId, async () => {
    const cart = await mustLoad(ops, cartId)

    if (cart.completed_at) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Cart ${cartId} is already completed`)
    }

    await ops.clearPayment(cartId)
    await ops.dropCashOnDeliveryFee(cartId)
  })
