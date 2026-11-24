import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { notifyPasswordReset } from "../workflows/utils/webshop-mail/password-reset-mail"

type ResetEvent = { entity_id?: string; actor_type?: string; token?: string; metadata?: Record<string, unknown> | null }

/**
 * A CUSTOMER'S PASSWORD-RESET REQUEST MAILS THE LINK (card 7bfca4eb). Medusa's stock route answers 201 for any address and emits
 * `auth.password_reset` (it does not check that the identity exists, so that nothing leaks), and nothing in the shop listened: no
 * mail ever went. Here: only for a CUSTOMER request (`actor_type` customer; the admin's own reset is another card's), only when the
 * address has an ACCOUNT (`has_account`: a guest checkout's customer record has no password to reset, and a mail to a stranger's
 * address is spam), in the language the request came in (the request's `metadata.locale`, Hungarian when it names none).
 * NEVER throws and never logs the address or the token: the request already answered.
 */
export default async function authPasswordResetMail({ event, container }: SubscriberArgs<ResetEvent>) {
  const { entity_id: entityId, actor_type: actorType, token, metadata } = event.data ?? {}
  if (actorType !== "customer" || !entityId || !token) return
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    const customers = container.resolve<{
      listCustomers: (
        filters: { email: string; has_account: boolean },
        config: { take: number; select: string[] }
      ) => Promise<{ id: string; email: string; first_name?: string | null; last_name?: string | null }[]>
    }>(Modules.CUSTOMER)
    const [customer] = await customers.listCustomers(
      { email: entityId.trim().toLowerCase(), has_account: true },
      { take: 1, select: ["id", "email", "first_name", "last_name"] }
    )
    if (!customer) return
    const name = [customer.last_name, customer.first_name].filter(Boolean).join(" ").trim() || null
    const language = typeof metadata?.locale === "string" ? metadata.locale : "hu"
    await notifyPasswordReset(container, { customer_id: customer.id, to: customer.email, name, language, token })
  } catch (error) {
    logger.warn(`password reset event: the mail was not prepared (${(error as Error)?.name ?? "error"})`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
