import {
  StepResponse,
  WorkflowResponse,
  createStep,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { GIFT_CARD_MODULE } from "../modules/gift-card"
import type GiftCardModuleService from "../modules/gift-card/service"

export type VoidCartGiftCardRedemptionsInput = {
  cart_id: string
  gift_card_ids: string[]
}

/**
 * GIVES BACK WHAT A DEAD COMPLETION TOOK (card 495c0007; barracuda, #818 v2): a completion that took a gift card's
 * share and died before its compensation leaves the redemption on the card. When the customer then takes the card off
 * the cart, each card's redemption for this cart is voided (a no-op where there is none). No compensation: a void that
 * went through is the cart's correct state, and the next completion takes the share again if the card is re-applied.
 */
export const voidCartGiftCardRedemptionsStep = createStep(
  "void-cart-gift-card-redemptions",
  async (input: VoidCartGiftCardRedemptionsInput, { container }) => {
    const giftCards = container.resolve<GiftCardModuleService>(GIFT_CARD_MODULE)
    const voided: string[] = []
    for (const id of input.gift_card_ids) {
      const result = await giftCards.voidGiftCardRedemption({ gift_card_id: id, reference: input.cart_id })
      if (result.voided) voided.push(id)
    }
    return new StepResponse(voided)
  }
)

export const voidCartGiftCardRedemptionsWorkflow = createWorkflow(
  "void-cart-gift-card-redemptions",
  (input: VoidCartGiftCardRedemptionsInput) => {
    const voided = voidCartGiftCardRedemptionsStep(input)
    return new WorkflowResponse(voided)
  }
)
