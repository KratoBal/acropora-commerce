import { createNewsletterTokenPost } from "../helpers"

/** The leaving link's page posts its token here (d707cf5f, item 3); see `helpers.ts`. */
export const POST = createNewsletterTokenPost((service, token) => service.unsubscribeByToken(token))
