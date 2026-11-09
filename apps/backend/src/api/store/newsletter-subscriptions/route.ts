import { notifyNewsletterConfirm } from "../../../workflows/utils/webshop-mail/newsletter-confirm-mail"
import { createNewsletterPost, defaultLimiters } from "./helpers"

/** The footer's newsletter sign-up (kirakat-lablec-kep, double opt-in d707cf5f); see `helpers.ts`. */
export const POST = createNewsletterPost(defaultLimiters(), (scope, signUp, to, sentAt) =>
  notifyNewsletterConfirm(scope, {
    id: signUp.id,
    to,
    name: signUp.name,
    language: signUp.language,
    confirmation_token: signUp.confirmation_token,
    unsubscribe_token: signUp.unsubscribe_token,
    sent_at: sentAt,
  })
)
