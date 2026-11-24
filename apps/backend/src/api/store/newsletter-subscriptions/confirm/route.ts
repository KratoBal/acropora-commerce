import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import type NewsletterModuleService from "../../../../modules/newsletter/service"
import { grantNewsletterBonusForEmail } from "../../../../workflows/utils/loyalty/grant-bonuses"
import type { StorePostNewsletterTokenType } from "../validators"

/**
 * The confirmation link's page posts its token here (double opt-in, d707cf5f; see `../helpers.ts`). A CONFIRMED address also pays the
 * newsletter bonus to the customer with an account that has it (loyalty, card dfb79916): only AFTER the confirmation, never at the
 * sign-up. The visitor is answered with `{ result }` and nothing else (the address stays server-side), and the points can never
 * fail the confirmation: `grantNewsletterBonusForEmail` does not throw.
 */
export const POST = async (req: MedusaStoreRequest<StorePostNewsletterTokenType>, res: MedusaResponse) => {
  const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE)
  const outcome = await service.confirmByTokenWithEmail(req.validatedBody.token)
  if (outcome.result === "confirmed" && outcome.email) await grantNewsletterBonusForEmail(req.scope, outcome.email)
  res.status(200).json({ result: outcome.result })
}
