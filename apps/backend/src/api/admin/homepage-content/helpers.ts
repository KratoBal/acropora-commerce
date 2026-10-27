import { MedusaContainer } from "@medusajs/framework"

import { HOMEPAGE_CONTENT_MODULE } from "../../../modules/homepage-content"
import HomepageContentModuleService from "../../../modules/homepage-content/service"

export const resolveHomepageContentService = (
  scope: MedusaContainer
): HomepageContentModuleService => scope.resolve(HOMEPAGE_CONTENT_MODULE)

/** What a buyer may see: the texts and slides, no id, no key. */
export const forStore = (content: {
  texts: unknown
  slides: unknown
  featured_handles?: unknown
  blocks?: unknown
  footer?: unknown
  newsletter?: unknown
  updated_at?: Date | string | null
}) => ({
  texts: content.texts,
  slides: content.slides,
  featured_handles: content.featured_handles ?? null,
  blocks: content.blocks ?? null,
  footer: content.footer ?? null,
  newsletter: content.newsletter ?? null,
  updated_at: content.updated_at ?? null,
})
