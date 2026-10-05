import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

import { GmailClient } from "./gmail-client"
import { base64Url, buildMimeMessage, formatMailFrom } from "./mime"
import type { WebshopMailOptions } from "../../workflows/utils/webshop-mail-config"

/**
 * THE SHOP'S EMAIL CHANNEL (see `webshop-mail-config.ts` for when it exists).
 *
 * A SKELETON: it sends what it is given, already written. There are no
 * templates yet; a notification without `content.subject` and a body is
 * refused, loudly, rather than sent empty or rendered from a guess. The
 * order-confirmation and refund mails (their subscribers and texts) come in
 * their own change.
 *
 * THE SENDER IS ALWAYS OURS. A notification's own `from` is ignored: the
 * Gmail account can only send as itself, and a caller-chosen sender is how a
 * shop mail ends up looking like someone else's.
 */
type InjectedDependencies = { fetch?: typeof fetch }

export default class GmailNotificationService extends AbstractNotificationProviderService {
  static identifier = "gmail"

  protected readonly options_: WebshopMailOptions
  protected readonly client_: GmailClient

  constructor(cradle: InjectedDependencies | Record<string, unknown>, options: WebshopMailOptions) {
    super()
    this.options_ = options
    /*
      THE CRADLE THROWS ON A MISSING KEY (awilix proxy). `fetch` is a test seam
      only; the module container has none, and the global one is used.
    */
    let injected: typeof fetch | undefined
    try {
      injected = (cradle as InjectedDependencies).fetch
    } catch {
      injected = undefined
    }
    this.client_ = new GmailClient(options, injected ?? fetch)
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["clientId", "clientSecret", "refreshToken", "user"]) {
      if (typeof options[key] !== "string" || !(options[key] as string).trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The webshop mail provider needs \`${key}\` (see webshop-mail-config.ts)`
        )
      }
    }
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const subject = notification.content?.subject?.trim()
    const text = notification.content?.text ?? undefined
    const html = notification.content?.html ?? undefined

    if (!subject || (!text && !html)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The webshop mail "${notification.template}" has no written subject and body; there are no templates yet`
      )
    }

    const raw = base64Url(
      buildMimeMessage(
        { to: notification.to, subject, text, html },
        formatMailFrom(this.options_.userName, this.options_.user)
      )
    )
    return this.client_.send(raw)
  }
}
