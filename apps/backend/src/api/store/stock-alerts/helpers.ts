import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { DEFAULT_NEWSLETTER_LANGUAGE, consentVersion } from "../../../modules/newsletter/defaults"
import { STOCK_ALERT_MODULE } from "../../../modules/stock-alert"
import type StockAlertModuleService from "../../../modules/stock-alert/service"
import type { StockAlertSignUpResult, StockAlertTokenResult } from "../../../modules/stock-alert/service"
import { STOCK_ALERT_CONSENT, speciesOfTitle, stockAlertOn } from "../../../modules/stock-alert/subject"
import { createRateLimiter, type RateLimiter } from "../newsletter-subscriptions/rate-limit"
import type { StorePostStockAlertTokenType, StorePostStockAlertType } from "./validators"

const TEN_MINUTES = 10 * 60 * 1000

/**
 * Three sign-ups per address and a hundred in all, per ten minutes: the newsletter's limits and its reason (the
 * storefront's server action is the one caller, so a per-IP limit here would be one limit for the whole shop).
 */
export const defaultLimiters = () => ({
  perAddress: createRateLimiter({ name: "stock-alert-per-address", max: 3, windowMs: TEN_MINUTES }),
  overall: createRateLimiter({ name: "stock-alert-overall", max: 100, windowMs: TEN_MINUTES }),
})

/** The confirmation mail's sender (`notifyStockAlertConfirm`), behind a seam for the spec. */
export type SendStockAlertConfirm = (
  scope: MedusaStoreRequest["scope"],
  signUp: Extract<StockAlertSignUpResult, { action: "confirm" }>,
  to: string,
  sentAt: Date
) => Promise<unknown>

type ProductRow = { id: string; title: string | null }

/**
 * THE SIGN-UP ("Szólj, ha jön hasonló", V2.4; the newsletter's double opt-in). In order: the switch (off: 403,
 * `FORBIDDEN`, the texts are not approved), the limit (429), the product (published, or 404), what it waits for
 * (`species`: the binomial at the head of the title, or 400 when the title names none; `product`: the product
 * itself), then the sign-up with the sentence the shop shows: a `pending` row and the confirmation mail, or nothing
 * for an address already confirmed for it. Every sign-up answers exactly the same, and the mail is not awaited, so
 * neither the reply nor its time tells whether an address is on a list. ("Ezzel a címmel már feliratkoztál erre a
 * fajra", in korall's texts, would tell exactly that, so it is never said.)
 */
export const createStockAlertPost =
  (
    limiters: { perAddress: RateLimiter; overall: RateLimiter },
    sendConfirm: SendStockAlertConfirm,
    env: NodeJS.ProcessEnv = process.env
  ) =>
  async (req: MedusaStoreRequest<StorePostStockAlertType>, res: MedusaResponse) => {
    if (!stockAlertOn(env)) throw new MedusaError(MedusaError.Types.FORBIDDEN, "The stock alert sign-up is off")
    const { product_id, kind, email } = req.validatedBody
    const language = req.validatedBody.locale ?? DEFAULT_NEWSLETTER_LANGUAGE
    if (!(await limiters.perAddress.allow(email)) || !(await limiters.overall.allow("all"))) {
      res.status(429).json({ message: "Too many sign-ups, try again later" })
      return
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      filters: { id: product_id, status: "published" },
      fields: ["id", "title"],
    })
    const product = (data as ProductRow[])[0]
    if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, "No such product")
    const subject =
      kind === "species"
        ? speciesOfTitle(product.title)
        : product.title?.trim()
          ? { key: product.id, label: product.title.trim() }
          : null
    if (!subject) throw new MedusaError(MedusaError.Types.INVALID_DATA, "This product names no species")

    const consentText = STOCK_ALERT_CONSENT[language][kind]
    const service: StockAlertModuleService = req.scope.resolve(STOCK_ALERT_MODULE)
    const now = new Date()
    const signUp = await service.signUp(
      {
        email,
        subject_kind: kind,
        subject_key: subject.key,
        subject_label: subject.label,
        source_product_id: product.id,
        consent_text: consentText,
        consent_version: consentVersion(consentText),
        consent_language: language,
        consented_at: now,
        source: "sold_piece",
      },
      now
    )
    // the sender never throws (`notifyStockAlertConfirm`); the catch keeps a seam that did from failing the process
    if (signUp.action === "confirm") void sendConfirm(req.scope, signUp, email, now).catch(() => undefined)
    res.status(200).json({ subscribed: true })
  }

/**
 * THE CONFIRMATION AND THE LEAVING LINK: a 200 with the `result` for every outcome, and the switch is not looked at
 * (leaving must always work; a confirmation finishes a consent given while the switch was on). No shared limit, for
 * the newsletter's reason (#698 review): a shared cap is one a stranger fills, and then nobody can leave.
 */
export const createStockAlertTokenPost =
  (use: (service: StockAlertModuleService, token: string) => Promise<StockAlertTokenResult>) =>
  async (req: MedusaStoreRequest<StorePostStockAlertTokenType>, res: MedusaResponse) => {
    const service: StockAlertModuleService = req.scope.resolve(STOCK_ALERT_MODULE)
    res.status(200).json(await use(service, req.validatedBody.token))
  }
