import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"

/**
 * THE LANGUAGE THE CUSTOMER ORDERED IN (card d5c6befd, Balázs 2026-11-03):
 * the shop's mails and the invoice mail go out in this language. The
 * storefront says which language the page was in when the payment started
 * (`POST /store/cart-locale/:cart_id`); the cart's metadata carries it and
 * Medusa copies it onto the order (`completeCartWorkflow`: `metadata:
 * cart.metadata`), the same way as the customer's notes (order-notes.ts).
 *
 * NOT THE ÁSZF RECORD'S `nyelv`: that one names the language of the LEGAL
 * document the customer was shown and is Hungarian until the English source
 * is wired (aszf-record.ts, `language_unsupported`). Two different facts, two
 * keys.
 *
 * Only `hu` and `en` are accepted; anything else is dropped, so a stored
 * value is always one the mail side knows. An order without the key (every
 * order before this card) is Hungarian: `orderLocaleOf` never guesses.
 */
export const STOREFRONT_LOCALE_KEY = "storefront_locale" as const

export const ORDER_LOCALES = ["hu", "en"] as const
export type OrderLocale = (typeof ORDER_LOCALES)[number]
export const DEFAULT_ORDER_LOCALE: OrderLocale = "hu"

/** `hu` or `en` exactly (no case folding, no trimming), otherwise null. */
export const parseOrderLocale = (value: unknown): OrderLocale | null =>
  typeof value === "string" && (ORDER_LOCALES as readonly string[]).includes(value) ? (value as OrderLocale) : null

/** The language a cart's or an order's metadata names; Hungarian when it names none or an unknown one. */
export const orderLocaleOf = (metadata: Record<string, unknown> | null | undefined): OrderLocale =>
  parseOrderLocale(metadata?.[STOREFRONT_LOCALE_KEY]) ?? DEFAULT_ORDER_LOCALE

export type CartLocaleResult = { status: "saved"; locale: OrderLocale } | { status: "not_found" } | { status: "completed" }

/** The checkout's write: the cart's metadata, before the order exists. */
export const saveCartLocale = async (
  container: MedusaContainer,
  cartId: string,
  locale: OrderLocale
): Promise<CartLocaleResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "completed_at"],
  })
  const cart = data?.[0] as { id: string; completed_at?: unknown } | undefined
  if (!cart) return { status: "not_found" }
  if (cart.completed_at) return { status: "completed" }
  /*
    ONLY THE ONE KEY GOES IN. Medusa merges a cart update's metadata into what
    is stored at the moment of the update, key by key (`mergeMetadata` in
    `@medusajs/utils`, applied by `MedusaInternalService.update`, measured on
    2.20.1; an empty string removes a key). So the rest of the metadata is
    never read here and never written back: a late write of this door cannot
    put an old copy of `aszf_elfogadas` over a newer one (barracuda, #644).
  */
  await updateCartWorkflow(container).run({ input: { id: cartId, metadata: { [STOREFRONT_LOCALE_KEY]: locale } } })
  return { status: "saved", locale }
}
