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
 *
 * FROM THE "ÉRKEZŐ ÁLLATOK" PAGE (V2.6 S4a, murena's contract): an arrival of a species has no product, so the page sends
 * the arrival row's `arrival_id` instead (exactly one of the two); the route reads the species from the ROW's name, and
 * such a sign-up waits for the species only.
 */
export const StorePostStockAlert = z
  .object({
    product_id: z.string().trim().min(1).max(100).optional(),
    arrival_id: z.string().trim().min(1).max(100).optional(),
    kind: z.enum(STOCK_ALERT_KINDS).default("species"),
    email: z.string().trim().toLowerCase().max(254).email(),
    consent: z.literal(true),
    locale: z.enum(NEWSLETTER_LANGUAGES).optional(),
  })
  .strict()
  .refine((v) => (v.product_id === undefined) !== (v.arrival_id === undefined), "Exactly one of product_id and arrival_id")
  .refine((v) => v.arrival_id === undefined || v.kind === "species", "An arrival sign-up waits for its species")

export type StorePostStockAlertType = z.infer<typeof StorePostStockAlert>

/** A link's token, from the storefront's confirmation or leaving page: the 43 characters a token has. */
export const StorePostStockAlertToken = z.object({ token: z.string().regex(NEWSLETTER_TOKEN_PATTERN) }).strict()

export type StorePostStockAlertTokenType = z.infer<typeof StorePostStockAlertToken>
