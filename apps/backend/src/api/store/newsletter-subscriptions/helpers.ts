import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import {
  DEFAULT_NEWSLETTER,
  DEFAULT_NEWSLETTER_LANGUAGE,
  consentVersion,
  shownConsentText,
} from "../../../modules/newsletter/defaults"
import type NewsletterModuleService from "../../../modules/newsletter/service"
import type { NewsletterSignUpResult, NewsletterTokenResult } from "../../../modules/newsletter/service"
import type { HomepageNewsletter } from "../../../modules/homepage-content/service"
import { resolveHomepageContentService } from "../../admin/homepage-content/helpers"
import { createRateLimiter, type RateLimiter } from "./rate-limit"
import type { StorePostNewsletterSubscriptionType, StorePostNewsletterTokenType } from "./validators"

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
  perAddress: createRateLimiter({ name: "newsletter-per-address", max: 3, windowMs: TEN_MINUTES }),
  overall: createRateLimiter({ name: "newsletter-overall", max: 100, windowMs: TEN_MINUTES }),
})

/** The confirmation mail's sender (`notifyNewsletterConfirm`), behind a seam for the spec. */
export type SendNewsletterConfirm = (
  scope: MedusaStoreRequest["scope"],
  signUp: Extract<NewsletterSignUpResult, { action: "confirm" }>,
  to: string,
  sentAt: Date
) => Promise<unknown>

/**
 * THE SIGN-UP (double opt-in, card d707cf5f). In order: the limit (429), the
 * row's switch (a row the OS turned off takes no sign-ups: 403, `FORBIDDEN`;
 * Medusa answers `NOT_ALLOWED` with 400), then the sign-up with the consent the
 * shop shows today: a `pending` row and the confirmation mail, or nothing for an
 * address already confirmed. Every case answers exactly the same, and the mail is
 * NOT awaited: a reply that waited for the OS and the mail provider would take
 * longer for a new address than for a confirmed one, and tell them apart.
 */
export const createNewsletterPost =
  (
    limiters: { perAddress: RateLimiter; overall: RateLimiter },
    sendConfirm: SendNewsletterConfirm
  ) =>
  async (
    req: MedusaStoreRequest<StorePostNewsletterSubscriptionType>,
    res: MedusaResponse
  ) => {
    const { name, email } = req.validatedBody
    const language = req.validatedBody.locale ?? DEFAULT_NEWSLETTER_LANGUAGE
    if (!(await limiters.perAddress.allow(email)) || !(await limiters.overall.allow("all"))) {
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

    const consentText = shownConsentText(row, language)
    const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE)
    const now = new Date()
    const signUp = await service.signUpByEmail(
      {
        email,
        name,
        consent_text: consentText,
        consent_version: consentVersion(consentText),
        consent_language: language,
        consented_at: now,
        source: "footer",
      },
      now
    )
    // the sender never throws (`notifyNewsletterConfirm`); the catch keeps a seam that did from failing the process
    if (signUp.action === "confirm") void sendConfirm(req.scope, signUp, email, now).catch(() => undefined)
    res.status(200).json({ subscribed: true })
  }

/**
 * THE CONFIRMATION AND THE LEAVING LINK (the storefront's two pages post the token
 * here). Every outcome is a 200 with its `result` (`confirmed`, `unsubscribed`,
 * `invalid`, `expired`): the page words each one. Neither looks at the row's
 * switch: leaving must work when sign-ups are off, and a confirmation finishes a
 * consent given while they were on.
 *
 * NO SHARED LIMIT (barracuda, #698 review): a cap counted for everyone together is
 * one a stranger fills with junk tokens, and then nobody can leave the list, which
 * the law says must always work. A token is 256 random bits, so guessing needs no
 * limit either.
 */
export const createNewsletterTokenPost =
  (use: (service: NewsletterModuleService, token: string) => Promise<NewsletterTokenResult>) =>
  async (req: MedusaStoreRequest<StorePostNewsletterTokenType>, res: MedusaResponse) => {
    const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE)
    res.status(200).json(await use(service, req.validatedBody.token))
  }
