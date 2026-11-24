import {
  notifyNewsletterConfirm,
  recordNewsletterConfirmOutcome,
} from "../../../workflows/utils/webshop-mail/newsletter-confirm-mail"
import { createNewsletterPost, defaultLimiters } from "./helpers"

/** The footer's newsletter sign-up (kirakat-lablec-kep, double opt-in d707cf5f); see `helpers.ts`. */
export const POST = createNewsletterPost(defaultLimiters(), async (scope, signUp, to, sentAt) => {
  const outcome = await notifyNewsletterConfirm(scope, {
    id: signUp.id,
    to,
    name: signUp.name,
    language: signUp.language,
    confirmation_token: signUp.confirmation_token,
    unsubscribe_token: signUp.unsubscribe_token,
    sent_at: sentAt,
  })
  // what became of the mail is kept on the row and said in the log (the answer to the visitor is the same whatever it was)
  await recordNewsletterConfirmOutcome(scope, { id: signUp.id, sentAt }, outcome)
  return outcome
})
