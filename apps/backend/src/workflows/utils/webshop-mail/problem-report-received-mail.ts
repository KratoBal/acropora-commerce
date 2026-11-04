import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { deliverShopMail } from "./deliver"
import { webshopMailRenderer } from "./os-mail-render"
import type { MailRenderFacts } from "./outbox-delivery"
import type { MailToSend } from "./prepare"
import { operationsOrSkip } from "./send"

/**
 * THE CUSTOMER'S ACKNOWLEDGEMENT OF A PROBLEM REPORT (V1.2 slice 4; Balázs said yes 2026-11-04 13:25 UTC, the text is
 * acrobot's and lives in the OS's templates: `WEBSHOP_PROBLEM_REPORT_RECEIVED` and its English twin).
 *
 * THE OS RENDERS IT AND NOTHING ELSE DOES (Balázs, 2026-10-05: the OS renders, the shop sends, no built-in fallback
 * mail). So the shop sends only the facts (the order's number and the case reference) and there is no text here. With
 * the renderer off (`ACROPORA_WEBSHOP_MAIL_RENDERER` not `os`) nothing goes: an older mail the shop has always sent in
 * its own words may still do so until the switch flips, a new one never does. The language, the customer's name and the
 * order's time come from the order, like every other mail (`loadCommon` of the outbox).
 *
 * Test shop only until the text goes before Balázs. The mail waits in the outbox when the OS cannot render now.
 */
export type ReceivedMailOrder = {
  /** the order's id: the outbox reads the language and the name from it */
  id: string
  /** the number the customer knows */
  displayId: number | string
  email: string | null
}

export type ProblemReportReceivedResult =
  | { sent: true }
  | { sent: false; reason: "mail_off" | "os_renderer_off" | "no_email" | "queued" | "failed" }

/**
 * Sends (or queues) the acknowledgement. NEVER throws: the report is already filed, and a mail that cannot go (the
 * switch off, the OS or the provider down) must not turn the customer's confirmation into an error. The outbox's
 * idempotency key (one per report) keeps a retried request from sending it twice.
 */
export const notifyProblemReportReceived = async (
  container: MedusaContainer,
  input: { order: ReceivedMailOrder; reportId: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProblemReportReceivedResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    if (!operationsOrSkip(env)) return { sent: false, reason: "mail_off" }
    if (webshopMailRenderer(env) !== "os") return { sent: false, reason: "os_renderer_off" }
    const to = input.order.email?.trim()
    if (!to) return { sent: false, reason: "no_email" }
    const render: MailRenderFacts = {
      template: "problem-report-received",
      facts: { display_id: input.order.displayId, report_id: input.reportId },
    }
    const mail: MailToSend & { render: MailRenderFacts } = {
      to,
      template: "problem-report-received",
      idempotency_key: `problem-report-received:${input.reportId}`,
      resource_id: input.order.id,
      // never sent as it is: the OS renders the text, and the renderer switch is checked above
      content: { subject: "", text: "", html: "" },
      render,
    }
    const delivery = await deliverShopMail(container, mail, env)
    return delivery.sent ? { sent: true } : { sent: false, reason: "queued" }
  } catch (error) {
    // the report id and the error kind only: no address, no text of the customer
    logger.warn(
      `problem report ${input.reportId}: the acknowledgement mail was not sent (${(error as Error)?.name ?? "error"})`,
    )
    return { sent: false, reason: "failed" }
  }
}
