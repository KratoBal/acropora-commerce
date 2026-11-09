import { createNewsletterTokenPost } from "../helpers"

/** The confirmation link's page posts its token here (double opt-in, d707cf5f); see `helpers.ts`. */
export const POST = createNewsletterTokenPost((service, token) => service.confirmByToken(token))
