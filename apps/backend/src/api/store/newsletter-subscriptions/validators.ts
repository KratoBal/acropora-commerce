import { z } from "@medusajs/framework/zod"

import { NEWSLETTER_LANGUAGES } from "../../../modules/newsletter/defaults"
import { NEWSLETTER_TOKEN_PATTERN } from "../../../modules/newsletter/double-opt-in"

/**
 * A sign-up from the footer: name, address, and the consent box ticked. The
 * consent TEXT is not taken from the request: the route records the text the
 * shop shows (the OS's, or the default), so a caller cannot write its own.
 * The form's LANGUAGE is sent (`locale`, optional: a caller without it is
 * Hungarian, as before), because the shop shows the default consent in the
 * language of the form, and the record has to be the sentence the buyer read.
 */
export const StorePostNewsletterSubscription = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().max(254).email(),
    consent: z.literal(true),
    locale: z.enum(NEWSLETTER_LANGUAGES).optional(),
  })
  .strict()

export type StorePostNewsletterSubscriptionType = z.infer<
  typeof StorePostNewsletterSubscription
>

/**
 * A link's token, from the storefront's confirmation or leaving page: the 43 characters a token has, or the request
 * is refused before anything is looked up.
 */
export const StorePostNewsletterToken = z
  .object({ token: z.string().regex(NEWSLETTER_TOKEN_PATTERN) })
  .strict()

export type StorePostNewsletterTokenType = z.infer<typeof StorePostNewsletterToken>
