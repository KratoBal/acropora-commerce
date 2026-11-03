import { DEFAULT_GMAIL_API_URL, DEFAULT_TOKEN_URL } from "../../modules/gmail-notification/gmail-client"

/**
 * THE SHOP'S OWN MAIL GOES OUT FROM COMMERCE, THROUGH GMAIL (acrobot 26254,
 * Balázs's path B): order confirmation and refund notices, sent by the shop,
 * not by the OS. Sender (acrobot 26255): "Acropora tengeri akvarisztika"
 * <webshop@acropora.hu>.
 *
 * OFF BY DEFAULT, AND OFF MEANS ABSENT. Unless ACROPORA_WEBSHOP_MAIL is
 * exactly "on", no notification module entry is declared at all, so the
 * config is what it was before this file existed. On, but without the three
 * Google keys, it is still absent: a missing key is a state (the keys arrive
 * when the deploy is ready, the OS's rule), not a reason to stop the server.
 * `webshopMailState` names which of the three it is, for whoever has to ask.
 *
 * NO KEY IS IN THE REPO OR ANYWHERE YET. The refresh token waits on whether
 * webshop@ is a mailbox of its own (it must be minted for that account).
 */
export const WEBSHOP_MAIL_PROVIDER_RESOLVE = "./src/modules/gmail-notification" as const

export const DEFAULT_WEBSHOP_MAIL_USER = "webshop@acropora.hu"
export const DEFAULT_WEBSHOP_MAIL_USER_NAME = "Acropora tengeri akvarisztika"

export type WebshopMailOptions = {
  clientId: string
  clientSecret: string
  refreshToken: string
  user: string
  userName: string
  apiUrl: string
  tokenUrl: string
  channels: ["email"]
}

export type WebshopMailState = "off" | "on_without_keys" | "on"

const keysOf = (env: NodeJS.ProcessEnv) => ({
  clientId: env.GMAIL_WEBSHOP_CLIENT_ID?.trim(),
  clientSecret: env.GMAIL_WEBSHOP_CLIENT_SECRET?.trim(),
  refreshToken: env.GMAIL_WEBSHOP_REFRESH_TOKEN?.trim(),
})

export const webshopMailState = (env: NodeJS.ProcessEnv = process.env): WebshopMailState => {
  if (env.ACROPORA_WEBSHOP_MAIL?.trim() !== "on") return "off"
  const { clientId, clientSecret, refreshToken } = keysOf(env)
  return clientId && clientSecret && refreshToken ? "on" : "on_without_keys"
}

export const webshopMailProviders = (
  env: NodeJS.ProcessEnv = process.env
): { resolve: typeof WEBSHOP_MAIL_PROVIDER_RESOLVE; id: "gmail"; options: WebshopMailOptions }[] => {
  if (webshopMailState(env) !== "on") return []
  const { clientId, clientSecret, refreshToken } = keysOf(env)
  return [
    {
      resolve: WEBSHOP_MAIL_PROVIDER_RESOLVE,
      id: "gmail",
      options: {
        clientId: clientId!,
        clientSecret: clientSecret!,
        refreshToken: refreshToken!,
        user: env.GMAIL_WEBSHOP_USER?.trim() || DEFAULT_WEBSHOP_MAIL_USER,
        userName: env.GMAIL_WEBSHOP_USER_NAME?.trim() || DEFAULT_WEBSHOP_MAIL_USER_NAME,
        apiUrl: (env.GMAIL_API_URL?.trim() || DEFAULT_GMAIL_API_URL).replace(/\/+$/, ""),
        tokenUrl: env.GOOGLE_OAUTH_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL,
        channels: ["email"],
      },
    },
  ]
}

/**
 * The notification module entry, or none.
 *
 * DECLARING IT REPLACES MEDUSA'S DEFAULT, IT DOES NOT ADD TO IT. Without an
 * entry, `defineConfig` (@medusajs/utils 2.20.1, define-config.js) declares the
 * notification module with ONE provider: `notification-local` on the `feed`
 * channel (the admin's notification feed). An entry of ours stands in its
 * place, so it carries that provider too, with the same options; otherwise
 * switching the mail on would silently switch the admin feed off. Measured by
 * loading the real `medusa-config.ts` (webshop-mail-medusa-config.unit.spec.ts).
 */
export const MEDUSA_DEFAULT_FEED_PROVIDER = {
  resolve: "@medusajs/medusa/notification-local",
  id: "local",
  options: { name: "Local Notification Provider", channels: ["feed"] },
} as const

export const webshopMailModules = (env: NodeJS.ProcessEnv = process.env) => {
  const providers = webshopMailProviders(env)
  return providers.length
    ? [
        {
          resolve: "@medusajs/medusa/notification" as const,
          options: { providers: [MEDUSA_DEFAULT_FEED_PROVIDER, ...providers] },
        },
      ]
    : []
}

/**
 * THE TEST SHOP'S MAIL GOES TO ONE INTERNAL ADDRESS (acrobot 41809; the same pattern as the OS's
 * PUSH_REDIRECT_TO_USER_IDS, Balázs 2026-09-25): with `ACROPORA_WEBSHOP_MAIL_REDIRECT_TO` set to one
 * address, every shop mail is sent there instead of to the customer, and the original recipient is
 * named in the subject and the body.
 *
 *   unset or blank   no redirect: the mail goes to the customer, exactly as before
 *   one address      the redirect
 *   anything else    `invalid`: the mail is NOT sent. A value that is set but cannot be read as ONE
 *                    address must never fall back to the real recipient: the whole point of the key
 *                    is that nothing reaches a customer from a place that asked for the opposite.
 */
export const WEBSHOP_MAIL_REDIRECT_ENV = "ACROPORA_WEBSHOP_MAIL_REDIRECT_TO"

export type WebshopMailRedirect = { kind: "off" } | { kind: "to"; address: string } | { kind: "invalid" }

// one plain address: no whitespace, no comma or semicolon (a list), no angle brackets (a name part)
const ONE_ADDRESS = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"']+$/

export const webshopMailRedirect = (env: NodeJS.ProcessEnv = process.env): WebshopMailRedirect => {
  const value = env[WEBSHOP_MAIL_REDIRECT_ENV]
  if (value === undefined || value.trim() === "") return { kind: "off" }
  const address = value.trim()
  return ONE_ADDRESS.test(address) ? { kind: "to", address } : { kind: "invalid" }
}
