import { MedusaError } from "@medusajs/framework/utils"

/**
 * WHAT THE PAYMENT LINK NEEDS FROM THE SERVER'S SETTINGS:
 *
 *   ACROPORA_PAYMENT_LINK_SECRET   signs the link (at least 32 characters)
 *   ACROPORA_STOREFRONT_URL        where the link points, e.g. the test shop's
 *                                  https address, without a trailing slash
 *
 * Without them no link is sent and no link is accepted: a link signed with an
 * empty secret could be forged by anyone.
 */
export type PaymentLinkConfig = { secret: string; storefrontUrl: string }

const MIN_SECRET_LENGTH = 32

export const paymentLinkConfig = (env: NodeJS.ProcessEnv = process.env): PaymentLinkConfig | null => {
  const secret = env.ACROPORA_PAYMENT_LINK_SECRET?.trim() ?? ""
  const url = env.ACROPORA_STOREFRONT_URL?.trim().replace(/\/+$/, "") ?? ""
  if (secret.length < MIN_SECRET_LENGTH || !/^https?:\/\/[^/\s]+/.test(url)) return null
  return { secret, storefrontUrl: url }
}

export const requirePaymentLinkConfig = (env: NodeJS.ProcessEnv = process.env): PaymentLinkConfig => {
  const config = paymentLinkConfig(env)
  if (!config) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A fizetési link nincs beállítva a szerveren (ACROPORA_PAYMENT_LINK_SECRET, ACROPORA_STOREFRONT_URL), ezért nem küldhető."
    )
  }
  return config
}

/** The storefront page the link opens (plan 2.2): `/{country}/rendeles-fizetese/{token}`. */
export const paymentLinkUrl = (config: PaymentLinkConfig, token: string, country = "hu") =>
  `${config.storefrontUrl}/${country}/rendeles-fizetese/${token}`
