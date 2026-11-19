import type { MedusaContainer } from "@medusajs/framework"

import { GIFT_CARD_MODULE } from "../../../modules/gift-card"
import type GiftCardModuleService from "../../../modules/gift-card/service"

export const resolveGiftCards = (scope: MedusaContainer): GiftCardModuleService =>
  scope.resolve(GIFT_CARD_MODULE)

/** What a screen may see of a card: never the code's hash, only its last four characters. */
export const GIFT_CARD_FIELDS = [
  "id",
  "code_last4",
  "currency_code",
  "initial_amount",
  "balance",
  "status",
  "expires_at",
  "recipient_email",
  "note",
  "issued_by",
  "created_at",
] as const

export const GIFT_CARD_LIST_LIMIT = 500

type Card = Record<string, unknown>
export const publicGiftCard = (card: Card) =>
  Object.fromEntries(GIFT_CARD_FIELDS.map((field) => [field, card[field] ?? null]))
