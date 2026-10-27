import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import {
  DEFAULT_NEWSLETTER,
  consentVersion,
} from "../../../modules/newsletter/defaults"
import type NewsletterModuleService from "../../../modules/newsletter/service"
import type { HomepageNewsletter } from "../../../modules/homepage-content/service"
import { resolveHomepageContentService } from "../../admin/homepage-content/helpers"
import { createRateLimiter, type RateLimiter } from "./rate-limit"
import type { StorePostNewsletterSubscriptionType } from "./validators"

const TEN_MINUTES = 10 * 60 * 1000

/** Five sign-ups per address of origin and a hundred in all, per ten minutes. */
export const defaultLimiters = () => ({
  perClient: createRateLimiter({ max: 5, windowMs: TEN_MINUTES }),
  overall: createRateLimiter({ max: 100, windowMs: TEN_MINUTES }),
})

/**
 * THE SIGN-UP. In order: the limit (429), the row's switch (a row the OS
 * turned off takes no sign-ups: 403), then the upsert with the consent the
 * shop shows today. A second sign-up with the same address updates the row
 * and answers exactly like the first, so the answer does not tell whether an
 * address was already on the list.
 *
 * The client's address is `req.ip`: Medusa sets `trust proxy` to 1, so behind
 * the one proxy in front of the shop it is the caller, not the proxy.
 */
export const createNewsletterPost =
  (limiters: { perClient: RateLimiter; overall: RateLimiter }) =>
  async (
    req: MedusaStoreRequest<StorePostNewsletterSubscriptionType>,
    res: MedusaResponse
  ) => {
    const client = req.ip ?? "unknown"
    if (!limiters.perClient.allow(client) || !limiters.overall.allow("all")) {
      res.status(429).json({ message: "Too many sign-ups, try again later" })
      return
    }

    const content = await resolveHomepageContentService(
      req.scope
    ).retrieveMainHomepageContent()
    const row =
      (content?.newsletter as HomepageNewsletter | null | undefined) ??
      DEFAULT_NEWSLETTER
    if (!row.enabled)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The newsletter sign-up is off"
      )

    const { name, email } = req.validatedBody
    const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE)
    await service.upsertSubscriberByEmail({
      email,
      name,
      consent_text: row.consent_text,
      consent_version: consentVersion(row.consent_text),
      consented_at: new Date(),
      source: "footer",
    })
    res.status(200).json({ subscribed: true })
  }
