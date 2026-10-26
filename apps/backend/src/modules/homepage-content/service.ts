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

export type HomepageBlock = { key: string; visible: boolean }

export type HomepageFooter = {
  intro: string
  columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>
  social: {
    facebook: string | null
    instagram: string | null
    youtube: string | null
  }
  bottom_text: string
}

export type HomepageContentInput = {
  texts: Record<string, string>
  /** `null`: not set, the storefront shows its starting slides. `[]`: no hero. */
  slides: HomepageSlide[] | null
  /** Product handles of the featured band, in order; absent or null: none. */
  featured_handles?: string[] | null
  /** Display order and visibility of the fixed blocks; absent keeps, null clears. */
  blocks?: HomepageBlock[] | null
  /** The editable footer; absent keeps, null clears. */
  footer?: HomepageFooter | null
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
    // `featured_handles` is written only when the sender SENT it: an absent key
    // leaves the stored list alone (a text-only save from an editor that does
    // not carry the list must not blank the band, barracuda #555), `null` or
    // `[]` empties it.
    const body = {
      texts: { ...input.texts },
      // `model.json()` is typed as an object, and `slides` is an array. The
      // column is jsonb and stores an array as is; the validator guarantees the
      // shape, so the cast sits here, once, rather than in the model.
      slides: (input.slides === null
        ? null
        : [...input.slides]) as unknown as Record<string, unknown>,
      ...(input.featured_handles === undefined
        ? {}
        : {
            featured_handles: (input.featured_handles
              ? [...input.featured_handles]
              : null) as unknown as Record<string, unknown>,
          }),
      // `blocks` and `footer` follow the same rule: written only when sent
      ...(input.blocks === undefined
        ? {}
        : {
            blocks: (input.blocks
              ? input.blocks.map((b) => ({ ...b }))
              : null) as unknown as Record<string, unknown>,
          }),
      ...(input.footer === undefined
        ? {}
        : {
            footer: (input.footer
              ? structuredClone(input.footer)
              : null) as unknown as Record<string, unknown>,
          }),
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
