import { createNewsletterTokenPost, defaultTokenLimiter } from "../helpers"

/** The confirmation link's page posts its token here (double opt-in, d707cf5f); see `helpers.ts`. */
export const POST = createNewsletterTokenPost(defaultTokenLimiter("newsletter-confirm"), (service, token) =>
  service.confirmByToken(token)
)
