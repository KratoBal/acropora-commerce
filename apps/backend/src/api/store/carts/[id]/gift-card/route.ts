import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCartCreditLinesWorkflow,
  deleteCartCreditLinesWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"

import { GIFT_CARD_MODULE } from "../../../../../modules/gift-card"
import type GiftCardModuleService from "../../../../../modules/gift-card/service"
import {
  amountOf,
  GIFT_CARD_CREDIT_REFERENCE,
  GIFT_CARD_MIXED_CART_MESSAGE,
  GIFT_CARD_UNUSABLE_MESSAGE,
  giftCardCredits,
  type CreditLineRow,
} from "../../../../../workflows/utils/gift-card-credit"
import { resolveCartShippingClass } from "../../../../../workflows/utils/resolve-cart-shipping-class"
import type { StorePostCartGiftCardType } from "./validators"

type CartRow = {
  id: string
  completed_at?: string | Date | null
  currency_code?: string | null
  total?: unknown
  credit_line_total?: unknown
  credit_lines?: CreditLineRow[] | null
  items?: { id?: string | null; variant_id?: string | null; requires_shipping?: boolean | null }[] | null
}

const CART_FIELDS = [
  "id",
  "completed_at",
  "currency_code",
  "total",
  "credit_line_total",
  "credit_lines.*",
  "items.id",
  "items.variant_id",
  "items.requires_shipping",
]

async function loadCart(scope: MedusaRequest["scope"], id: string): Promise<CartRow | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "cart", fields: CART_FIELDS, filters: { id } })
  return (data[0] as CartRow | undefined) ?? null
}

/** What the customer sees of the applied card: never the code, only its last four characters and the amount. */
const answer = (cart: CartRow) => {
  const credit = giftCardCredits(cart.credit_lines)[0]
  return {
    gift_card: credit
      ? {
          code_last4: (credit.metadata?.code_last4 as string | undefined) ?? null,
          amount: amountOf(credit.amount),
        }
      : null,
    total: amountOf(cart.total),
  }
}

async function removeGiftCardCredits(scope: MedusaRequest["scope"], cart: CartRow) {
  const ids = giftCardCredits(cart.credit_lines).map((line) => line.id)
  if (ids.length) await deleteCartCreditLinesWorkflow(scope).run({ input: { id: ids } })
}

/**
 * POST /store/carts/:id/gift-card {code}: pays the cart, up to its total, with a gift card (card 495c0007). The
 * balance is NOT taken here: only when the cart is completed (the complete-cart hook), so an abandoned cart costs the
 * card nothing. One card per cart: a new code replaces the earlier one.
 *
 * 400 the code cannot pay (one message for every reason, so the answer does not tell a guessed code from a spent
 * one); 404 no cart; 409 already ordered, a mixed cart (acrobot 56682: not in this first version), or nothing to pay.
 */
export const POST = async (req: MedusaRequest<StorePostCartGiftCardType>, res: MedusaResponse) => {
  const cart = await loadCart(req.scope, req.params.id)
  if (!cart) {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (cart.completed_at) {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett." })
    return
  }
  const { split_line_ids } = await resolveCartShippingClass(cart, req.scope)
  if (split_line_ids.length) {
    res.status(409).json({ code: "gift_card_mixed_cart", message: GIFT_CARD_MIXED_CART_MESSAGE })
    return
  }

  const giftCards = req.scope.resolve<GiftCardModuleService>(GIFT_CARD_MODULE)
  const card = await giftCards.retrieveGiftCardByCode(req.validatedBody.code)
  const usable =
    !!card &&
    card.status === "active" &&
    card.balance > 0 &&
    (!card.expires_at || new Date(card.expires_at).getTime() > Date.now()) &&
    card.currency_code?.toLowerCase() === cart.currency_code?.toLowerCase()
  if (!card || !usable) {
    res.status(400).json({ code: "gift_card_unusable", message: GIFT_CARD_UNUSABLE_MESSAGE })
    return
  }

  // the total before any credit: Medusa's total has the credits taken off already
  const before = amountOf(cart.total) + amountOf(cart.credit_line_total)
  const amount = Math.min(card.balance, Math.floor(before))
  if (amount < 1) {
    res.status(409).json({ code: "gift_card_nothing_to_pay", message: "A kosárban nincs fizetendő összeg." })
    return
  }

  await removeGiftCardCredits(req.scope, cart)
  await createCartCreditLinesWorkflow(req.scope).run({
    input: [
      {
        cart_id: cart.id,
        amount,
        reference: GIFT_CARD_CREDIT_REFERENCE,
        reference_id: card.id,
        metadata: { code_last4: card.code_last4, cart_id: cart.id },
      },
    ],
  })
  await refreshPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id: cart.id } })
  res.json(answer((await loadCart(req.scope, cart.id))!))
}

/** DELETE /store/carts/:id/gift-card: takes the gift card off the cart (nothing was taken from the card yet). */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const cart = await loadCart(req.scope, req.params.id)
  if (!cart) {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (cart.completed_at) {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett." })
    return
  }
  await removeGiftCardCredits(req.scope, cart)
  await refreshPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id: cart.id } })
  res.json(answer((await loadCart(req.scope, cart.id))!))
}
