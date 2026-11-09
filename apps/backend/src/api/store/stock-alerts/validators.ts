import { z } from "@medusajs/framework/zod"

import { NEWSLETTER_LANGUAGES } from "../../../modules/newsletter/defaults"
import { NEWSLETTER_TOKEN_PATTERN } from "../../../modules/newsletter/double-opt-in"
import { STOCK_ALERT_KINDS } from "../../../modules/stock-alert/subject"

/**
 * A stock alert sign-up from a product page: the page's product, what to wait for (`species`, the default, or
 * `product`), the address and the ticked box. Neither the species nor the consent TEXT comes from the request: the
 * route reads the product's title for the species and records the sentence the shop shows, so a caller can write
 * neither. The form's LANGUAGE is sent (`locale`, optional, Hungarian without it), as the newsletter's: the record is
 * the sentence the buyer read, in the language they read it.
 */
export const StorePostStockAlert = z
  .object({
    product_id: z.string().trim().min(1).max(100),
    kind: z.enum(STOCK_ALERT_KINDS).default("species"),
    email: z.string().trim().toLowerCase().max(254).email(),
    consent: z.literal(true),
    locale: z.enum(NEWSLETTER_LANGUAGES).optional(),
  })
  .strict()

export type StorePostStockAlertType = z.infer<typeof StorePostStockAlert>

/** A link's token, from the storefront's confirmation or leaving page: the 43 characters a token has. */
export const StorePostStockAlertToken = z.object({ token: z.string().regex(NEWSLETTER_TOKEN_PATTERN) }).strict()

export type StorePostStockAlertTokenType = z.infer<typeof StorePostStockAlertToken>
