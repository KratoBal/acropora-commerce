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

/**
 * Three sign-ups per e-mail address and a hundred in all, per ten minutes.
 *
 * PER ADDRESS, NOT PER CLIENT IP (barracuda, #577 review): the storefront form
 * reaches this route through a server action (the test shop's CORS does not
 * admit the storefront's origin, measured 2026-10-27), so every sign-up
 * arrives from the storefront server's address, and a per-IP limit here would
 * be one limit for the whole shop. The storefront limits per visitor (the
 * proxy's `x-real-ip`); a direct caller is held by the overall cap.
 */
export const defaultLimiters = () => ({
  perAddress: createRateLimiter({ max: 3, windowMs: TEN_MINUTES }),
  overall: createRateLimiter({ max: 100, windowMs: TEN_MINUTES }),
})

/**
 * THE SIGN-UP. In order: the limit (429), the row's switch (a row the OS
 * turned off takes no sign-ups: 403, `FORBIDDEN`; Medusa answers
 * `NOT_ALLOWED` with 400), then the upsert with the consent the shop shows
 * today. A second sign-up with the same address updates the row and answers
 * exactly like the first, so the answer does not tell whether an address was
 * already on the list.
 */
export const createNewsletterPost =
  (limiters: { perAddress: RateLimiter; overall: RateLimiter }) =>
  async (
    req: MedusaStoreRequest<StorePostNewsletterSubscriptionType>,
    res: MedusaResponse
  ) => {
    const { name, email } = req.validatedBody
    if (!limiters.perAddress.allow(email) || !limiters.overall.allow("all")) {
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
        MedusaError.Types.FORBIDDEN,
        "The newsletter sign-up is off"
      )

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
