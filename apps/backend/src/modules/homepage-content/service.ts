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
    // `model.json()` is typed as an object, and `slides` is an array. The
    // column is jsonb and stores an array as is; the validator guarantees the
    // shape, so the cast sits here, once, rather than in the model.
    const body = {
      texts: { ...input.texts },
      slides: [...input.slides] as unknown as Record<string, unknown>,
    }
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
