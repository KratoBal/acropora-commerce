import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { deliverShopMail } from "./deliver"
import { webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { operationsOrSkip } from "./send"

/**
 * THE CUSTOMER'S ACKNOWLEDGEMENT OF A WITHDRAWAL DECLARATION (V0.3 slice 2; 45/2014. Korm. rendelet 22. §: the
 * acknowledgement goes on a durable medium, without undue delay). The e-mail is that medium.
 *
 * THE OS RENDERS IT AND NOTHING ELSE DOES (Balázs, 2026-10-05: the OS renders, the shop sends, no built-in fallback
 * mail), so there is NO TEXT HERE and no statutory wording: the shop sends the facts (the order's number, the
 * declaration's reference, the name declared, the lines, the time of receipt) and the wording of the mail is the owner's
 * and the lawyer's, [KITÖLTENDŐ] in the OS's template `WEBSHOP_WITHDRAWAL_RECEIVED`. Until that template exists the OS
 * answers 422 and the mail waits in the outbox (nothing goes out in the shop's own words). With the renderer off
 * (`ACROPORA_WEBSHOP_MAIL_RENDERER` not `os`) nothing goes at all.
 *
 * Test shop only. The language, the order's time and the customer's billing name come from the order, like every mail.
 */
export type WithdrawalMailOrder = {
  /** the order's id: the outbox reads the language and the name from it */
  id: string
  /** the number the customer knows */
  displayId: number | string
  email: string | null
}

export type WithdrawalReceivedResult =
  | { sent: true }
  | { sent: false; reason: "mail_off" | "os_renderer_off" | "no_email" | "queued" | "failed" }

/**
 * Sends (or queues) the acknowledgement. NEVER throws: the declaration is already recorded, and a mail that cannot go
 * (the switch off, the OS or the provider down) must not turn the customer's confirmation into an error. The outbox's
 * idempotency key (one per declaration) keeps a retried request from sending it twice.
 */
export const notifyWithdrawalReceived = async (
  container: MedusaContainer,
  input: {
    order: WithdrawalMailOrder
    withdrawalId: string
    declaredName: string
    itemIds: string[]
    receivedAt: string
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<WithdrawalReceivedResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!operationsOrSkip(env)) return { sent: false, reason: "mail_off" }
    if (webshopMailRenderer(env) !== "os") return { sent: false, reason: "os_renderer_off" }
    const to = input.order.email?.trim()
    if (!to) return { sent: false, reason: "no_email" }
    const render: MailRenderFacts = {
      template: "withdrawal-received",
      facts: {
        display_id: input.order.displayId,
        withdrawal_id: input.withdrawalId,
        declared_name: input.declaredName,
        item_ids: input.itemIds,
        received_at: input.receivedAt,
      },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to,
      template: "withdrawal-received",
      idempotency_key: `withdrawal-received:${input.withdrawalId}`,
      resource_id: input.order.id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the declaration id and the error kind only: no address, no name
    logger.warn(
      `withdrawal ${input.withdrawalId}: the acknowledgement mail was not sent (${(error as Error)?.name ?? "error"})`,
    )
    return { sent: false, reason: "failed" }
  }
}
