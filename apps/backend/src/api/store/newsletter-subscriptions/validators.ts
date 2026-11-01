import { z } from "@medusajs/framework/zod"

import { NEWSLETTER_LANGUAGES } from "../../../modules/newsletter/defaults"

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
