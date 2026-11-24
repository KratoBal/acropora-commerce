import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCartCreditLinesWorkflow,
  deleteCartCreditLinesWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"

import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import type LoyaltyModuleService from "../../../../../modules/loyalty/service"
import { amountOf, giftCardCredits, type CreditLineRow } from "../../../../../workflows/utils/gift-card-credit"
import {
  LOYALTY_CREDIT_REFERENCE,
  LOYALTY_FOREIGN_CART_MESSAGE,
  LOYALTY_LOGIN_MESSAGE,
  LOYALTY_MIXED_CART_MESSAGE,
  LOYALTY_OFF_MESSAGE,
  LOYALTY_WITH_GIFT_CARD_MESSAGE,
  loyaltyCredits,
  loyaltyUnderMinimumMessage,
  maxPoints,
  pointsOfCredit,
} from "../../../../../workflows/utils/loyalty/loyalty-credit"
import { loadLoyaltySettings } from "../../../../../workflows/utils/loyalty/loyalty-settings"
import { resolveCartShippingClass } from "../../../../../workflows/utils/resolve-cart-shipping-class"
import type { StorePostCartLoyaltyPointsType } from "./validators"

type CartRow = {
  id: string
  customer_id?: string | null
  completed_at?: string | Date | null
  total?: unknown
  credit_line_total?: unknown
  credit_lines?: CreditLineRow[] | null
  items?: { id?: string | null; variant_id?: string | null; requires_shipping?: boolean | null }[] | null
}

const CART_FIELDS = [
  "id",
  "customer_id",
  "completed_at",
  "total",
  "credit_line_total",
  "credit_lines.*",
  "items.id",
  "items.variant_id",
  "items.requires_shipping",
]

async function loadCart(scope: AuthenticatedMedusaRequest["scope"], id: string): Promise<CartRow | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "cart", fields: CART_FIELDS, filters: { id } })
  return (data[0] as CartRow | undefined) ?? null
}

/** What the customer sees: the applied points and amount, the cart's total, and the limits the cart is measured against. */
async function answer(scope: AuthenticatedMedusaRequest["scope"], cart: CartRow, customerId: string) {
  const settings = (await loadLoyaltySettings(scope)).settings
  const credit = loyaltyCredits(cart.credit_lines)[0]
  const balance = await scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE).balanceOf(customerId)
  const before = amountOf(cart.total) + amountOf(cart.credit_line_total)
  return {
    loyalty: {
      enabled: settings.enabled,
      applied_points: credit ? pointsOfCredit(credit) : 0,
      applied_amount: credit ? amountOf(credit.amount) : 0,
      balance,
      max_points: maxPoints({ beforeCredits: before, balance, settings }),
      min_points: settings.minPoints,
      min_order: settings.minOrder,
      point_value: settings.value,
    },
    total: amountOf(cart.total),
  }
}

type Refusal = { status: number; body: { code: string; message: string } }

/** The checks every verb shares: the switch, the customer, the cart is theirs and still open. */
async function guard(req: AuthenticatedMedusaRequest): Promise<{ cart: CartRow; customerId: string } | Refusal> {
  if (!(await loadLoyaltySettings(req.scope)).settings.enabled) return { status: 409, body: { code: "loyalty_off", message: LOYALTY_OFF_MESSAGE } }
  const customerId = req.auth_context?.actor_id
  if (!customerId) return { status: 401, body: { code: "unauthorized", message: LOYALTY_LOGIN_MESSAGE } }
  const cart = await loadCart(req.scope, req.params.id)
  // a cart of another customer answers like a missing one: the id is scriptable, its existence is not for sale
  if (!cart || cart.customer_id !== customerId)
    return { status: 404, body: { code: "not_found", message: LOYALTY_FOREIGN_CART_MESSAGE } }
  if (cart.completed_at)
    return { status: 409, body: { code: "cart_completed", message: "Ebből a kosárból már rendelés lett." } }
  return { cart, customerId }
}

const refusal = (value: unknown): value is Refusal => typeof (value as Refusal)?.status === "number"

/**
 * GET /store/carts/:id/loyalty-points: what the customer's points can do for this cart (the balance, the most the cart
 * takes, the minimums, what is applied). The checkout reads it to show the choice.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const g = await guard(req)
  if (refusal(g)) {
    res.status(g.status).json(g.body)
    return
  }
  res.json(await answer(req.scope, g.cart, g.customerId))
}

/**
 * POST /store/carts/:id/loyalty-points {points?}: pays the cart, up to what it takes, with the signed-in customer's
 * points (card dfb79916). The ledger is NOT touched here: only when the cart is completed (the complete-cart hook), so an
 * abandoned cart costs the customer nothing. One points credit per cart: a new request replaces the earlier one. No
 * `points` means as many as the cart takes; more than the cart takes is lowered to that, fewer than the minimum is
 * refused.
 *
 * 401 not signed in; 404 not the customer's cart; 409 switched off, already ordered, mixed cart (as the gift card),
 * a gift card on the cart, under the order minimum, no usable balance.
 */
export const POST = async (req: AuthenticatedMedusaRequest<StorePostCartLoyaltyPointsType>, res: MedusaResponse) => {
  const g = await guard(req)
  if (refusal(g)) {
    res.status(g.status).json(g.body)
    return
  }
  const { cart, customerId } = g
  const settings = (await loadLoyaltySettings(req.scope)).settings

  const { split_line_ids } = await resolveCartShippingClass(cart, req.scope)
  if (split_line_ids.length) {
    res.status(409).json({ code: "loyalty_mixed_cart", message: LOYALTY_MIXED_CART_MESSAGE })
    return
  }
  if (giftCardCredits(cart.credit_lines).length) {
    res.status(409).json({ code: "loyalty_with_gift_card", message: LOYALTY_WITH_GIFT_CARD_MESSAGE })
    return
  }

  // the total before any credit: Medusa's total has the credits taken off already
  const before = amountOf(cart.total) + amountOf(cart.credit_line_total)
  const balance = await req.scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE).balanceOf(customerId)
  const most = maxPoints({ beforeCredits: before, balance, settings })
  if (most < 1) {
    res.status(409).json({
      code: before < settings.minOrder || balance >= settings.minPoints ? "loyalty_under_minimum" : "loyalty_no_balance",
      message:
        before < settings.minOrder || balance >= settings.minPoints
          ? loyaltyUnderMinimumMessage(settings)
          : "Nincs beváltható hűségpontod.",
    })
    return
  }
  const points = Math.min(req.validatedBody.points ?? most, most)
  if (points < settings.minPoints) {
    res.status(400).json({ code: "loyalty_under_minimum", message: loyaltyUnderMinimumMessage(settings) })
    return
  }

  const ids = loyaltyCredits(cart.credit_lines).map((line) => line.id)
  if (ids.length) await deleteCartCreditLinesWorkflow(req.scope).run({ input: { id: ids } })
  await createCartCreditLinesWorkflow(req.scope).run({
    input: [
      {
        cart_id: cart.id,
        amount: points * settings.value,
        reference: LOYALTY_CREDIT_REFERENCE,
        reference_id: customerId,
        metadata: { points, cart_id: cart.id },
      },
    ],
  })
  await refreshPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id: cart.id } })
  res.json(await answer(req.scope, (await loadCart(req.scope, cart.id))!, customerId))
}

/**
 * DELETE /store/carts/:id/loyalty-points: takes the points off the cart; nothing was taken from the ledger yet.
 *
 * IT DOES NOT GIVE BACK A REDEMPTION, on purpose, for the gift card's reason (barracuda, #818 v3): `completed_at` is
 * still empty while a completion runs, so a DELETE in the middle of one would void a redemption whose order is still
 * made with the credit it loaded. A completion that took the points and died before its compensation is a rare stop; its
 * redemption stays, keyed by the cart, for a reconciliation by hand.
 */
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const g = await guard(req)
  if (refusal(g)) {
    res.status(g.status).json(g.body)
    return
  }
  const ids = loyaltyCredits(g.cart.credit_lines).map((line) => line.id)
  if (ids.length) await deleteCartCreditLinesWorkflow(req.scope).run({ input: { id: ids } })
  await refreshPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id: g.cart.id } })
  res.json(await answer(req.scope, (await loadCart(req.scope, g.cart.id))!, g.customerId))
}
