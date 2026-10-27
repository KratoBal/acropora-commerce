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
  featured_brand_handles?: unknown
  blocks?: unknown
  footer?: unknown
  updated_at?: Date | string | null
}) => ({
  texts: content.texts,
  slides: content.slides,
  featured_handles: content.featured_handles ?? null,
  featured_brand_handles: content.featured_brand_handles ?? null,
  blocks: content.blocks ?? null,
  footer: content.footer ?? null,
  updated_at: content.updated_at ?? null,
})
