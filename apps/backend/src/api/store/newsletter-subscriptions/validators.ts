import { z } from "@medusajs/framework/zod"

/**
 * A sign-up from the footer: name, address, and the consent box ticked. The
 * consent TEXT is not taken from the request: the route records the text the
 * shop shows (the OS's, or the default), so a caller cannot write its own.
 */
export const StorePostNewsletterSubscription = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().max(254).email(),
    consent: z.literal(true),
  })
  .strict()

export type StorePostNewsletterSubscriptionType = z.infer<
  typeof StorePostNewsletterSubscription
>
