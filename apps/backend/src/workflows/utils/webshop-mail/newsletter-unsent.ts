import type { MedusaContainer } from "@medusajs/framework/types"

import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import type { NewsletterMailResult } from "../../../modules/newsletter/double-opt-in"
import type NewsletterModuleService from "../../../modules/newsletter/service"
import type { StuckMail } from "./deliver"
import { NEWSLETTER_MAIL_NOT_SENT_WHY } from "./newsletter-mail-why"

/**
 * THE NEWSLETTER CONFIRMATIONS THAT DID NOT GO, in the OS's list of mails that did not go (task hirlevel-level-eredmeny-20261124).
 * A confirmation mail that is skipped (a switch off, the mail or the renderer off, no https address) or fails before the outbox
 * takes it never becomes an outbox row, so the list the fleet reads showed nothing for it (measured 2026-11-24: three sign-ups, one
 * mail, no trace). The sources are the sign-up rows that carry a not-sent result and whose link would still be live.
 *
 * THE SWITCH BEING OFF IS ONE ITEM (barracuda 60924): it is the default until the mail's text is approved, so a row per sign-up would fill the list with
 * things nobody can act on and bury the mail that is really stuck. The other reasons are a row each.
 *
 * SHAPED LIKE AN OUTBOX ITEM so the OS needs no change: `config` for the switches and the environment (nothing mends itself), `permanent`
 * for a failure; `last_error` says what is off and what to do (`NEWSLETTER_MAIL_NOT_SENT_WHY`); the id is the sign-up row's, which no
 * outbox route knows (a requeue of it answers 404: the way to mail it again is a new sign-up once the cause is mended). NEVER THROWS:
 * a failed read lists nothing here and leaves the outbox's own items as they were.
 */
export const SWITCH_OFF_ITEM_ID = "newsletter-confirm-switch-off"

export const unsentNewsletterConfirmations = async (
  container: MedusaContainer,
  now: Date
): Promise<{ items: StuckMail[]; total: number }> => {
  try {
    const service = container.resolve<NewsletterModuleService>(NEWSLETTER_MODULE)
    if (typeof service?.listUnsentConfirmations !== "function") return { items: [], total: 0 }
    const { rows, switchOff, total } = await service.listUnsentConfirmations(now)
    const items: StuckMail[] = rows.map(({ id, email, result, at }) => ({
      id,
      template: "newsletter-confirm",
      display_id: null,
      resource_id: id,
      to: email,
      attempts: 1,
      failure_kind: result === "failed" ? "permanent" : "config",
      last_error: NEWSLETTER_MAIL_NOT_SENT_WHY[result as Exclude<NewsletterMailResult, "sent" | "queued">] ?? result,
      created_at: at.toISOString(),
      next_attempt_at: null,
      alerted_at: null,
    }))
    // the switch is off by design until the text is approved: ONE item for all of them, never a row each
    if (switchOff.count > 0 && switchOff.latest)
      items.push({
        id: SWITCH_OFF_ITEM_ID,
        template: "newsletter-confirm",
        display_id: null,
        resource_id: SWITCH_OFF_ITEM_ID,
        to: "",
        attempts: 0,
        failure_kind: "config",
        last_error: `${switchOff.count} pending sign-up(s) were not mailed: ${NEWSLETTER_MAIL_NOT_SENT_WHY.switch_off}`,
        created_at: switchOff.latest.toISOString(),
        next_attempt_at: null,
        alerted_at: null,
      })
    return { items, total }
  } catch {
    return { items: [], total: 0 }
  }
}
