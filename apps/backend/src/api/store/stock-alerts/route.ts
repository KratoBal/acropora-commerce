import { notifyStockAlertConfirm } from "../../../workflows/utils/webshop-mail/stock-alert-confirm-mail"
import { createStockAlertPost, defaultLimiters } from "./helpers"

/** "Szólj, ha jön hasonló" (V2.4, card 0c1265d2), the newsletter's double opt-in; see `helpers.ts`. */
export const POST = createStockAlertPost(defaultLimiters(), (scope, signUp, to, sentAt) =>
  notifyStockAlertConfirm(scope, {
    id: signUp.id,
    to,
    subject_label: signUp.subject_label,
    confirmation_token: signUp.confirmation_token,
    unsubscribe_token: signUp.unsubscribe_token,
    sent_at: sentAt,
  })
)
