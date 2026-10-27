import { MedusaService } from "@medusajs/framework/utils"

import NewsletterSubscriber from "./models/newsletter-subscriber"

export type NewsletterSignUp = {
  /** Already trimmed and lowercased by the route's validator. */
  email: string
  name: string
  consent_text: string
  consent_version: string
  consented_at: Date
  source: string
}

class NewsletterModuleService extends MedusaService({ NewsletterSubscriber }) {
  /**
   * The sign-up, by address: a new row, or the existing one updated (name and
   * consent). The unique index on `email` is the real guard; two sign-ups
   * racing on the same new address end in one row and one constraint error,
   * which the route answers like any other failure.
   */
  async upsertSubscriberByEmail(input: NewsletterSignUp) {
    const [existing] = await this.listNewsletterSubscribers(
      { email: input.email },
      { take: 1 }
    )
    if (!existing) {
      const [created] = await this.createNewsletterSubscribers([input])
      return created
    }
    const [updated] = await this.updateNewsletterSubscribers([
      { id: existing.id, ...input },
    ])
    return updated
  }
}

export default NewsletterModuleService
