import { MedusaService } from "@medusajs/framework/utils"

import HomepageContent from "./models/homepage-content"

/** The only record today. Another key would be another home page variant. */
export const MAIN_HOMEPAGE_KEY = "main"

export type HomepageSlide = {
  eyebrow: string
  title: string
  text: string
  cta: string
  cta_href: string | null
  cta2: string
  cta2_href: string | null
  caption: string
  caption2: string
  image_url: string | null
  image_alt: string
}

export type HomepageContentInput = {
  texts: Record<string, string>
  slides: HomepageSlide[]
}

class HomepageContentModuleService extends MedusaService({ HomepageContent }) {
  /** The whole record, written by the OS. The unique index on `key` is the real guard. */
  async upsertMainHomepageContent(input: HomepageContentInput) {
    const [existing] = await this.listHomepageContents(
      { key: MAIN_HOMEPAGE_KEY },
      { take: 1 }
    )
    const body = { texts: { ...input.texts }, slides: [...input.slides] }
    if (!existing) {
      const [created] = await this.createHomepageContents([
        { key: MAIN_HOMEPAGE_KEY, ...body },
      ])
      return created
    }
    const [updated] = await this.updateHomepageContents([
      { id: existing.id, ...body },
    ])
    return updated
  }

  async retrieveMainHomepageContent() {
    const [existing] = await this.listHomepageContents(
      { key: MAIN_HOMEPAGE_KEY },
      { take: 1 }
    )
    return existing ?? null
  }
}

export default HomepageContentModuleService
