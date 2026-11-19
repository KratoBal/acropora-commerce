import { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"

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

/** The footer's newsletter row; the consent text is what a sign-up records. */
export type HomepageNewsletter = {
  enabled: boolean
  title: string
  text: string
  consent_text: string
  button: string
}

export type HomepageContentInput = {
  texts: Record<string, string>
  /** `null`: not set, the storefront shows its starting slides. `[]`: no hero. */
  slides: HomepageSlide[] | null
  /** Product handles of the featured band, in order; absent or null: none. */
  featured_handles?: string[] | null
  /** Brand handles of the logo strip, in order; absent keeps, null clears. */
  featured_brand_handles?: string[] | null
  /** Display order and visibility of the fixed blocks; absent keeps, null clears. */
  blocks?: HomepageBlock[] | null
  /** The editable footer; absent keeps, null clears. */
  footer?: HomepageFooter | null
  /** The footer's newsletter row; absent keeps, null clears. */
  newsletter?: HomepageNewsletter | null
}

/**
 * THE TEXT KEYS A SAVE NO LONGER CARRIES (card 2ef36b38). The ORM merges an object field on update (`mergeObjectProperties: true`,
 * @medusajs/utils dal/mikro-orm), so a key the OS left out of `texts` (its "Alapérték" reset drops the override) would stay in the
 * stored record with its last value and the storefront would keep showing it. A non-empty answer means the record has to be
 * REPLACED, not updated.
 */
export function removedTextKeys(
  stored: unknown,
  sent: Record<string, string>
): string[] {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return []
  return Object.keys(stored as Record<string, unknown>).filter(
    (key) => !Object.prototype.hasOwnProperty.call(sent, key)
  )
}

class HomepageContentModuleService extends MedusaService({ HomepageContent }) {
  /** The whole record, written by the OS. The unique index on `key` is the real guard. */
  @InjectManager()
  async upsertMainHomepageContent(
    input: HomepageContentInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.upsertMainHomepageContent_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async upsertMainHomepageContent_(
    input: HomepageContentInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [existing] = await this.listHomepageContents(
      { key: MAIN_HOMEPAGE_KEY },
      { take: 1 },
      sharedContext
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
      // `featured_brand_handles`, `blocks` and `footer` follow the same rule:
      // written only when sent
      ...(input.featured_brand_handles === undefined
        ? {}
        : {
            featured_brand_handles: (input.featured_brand_handles
              ? [...input.featured_brand_handles]
              : null) as unknown as Record<string, unknown>,
          }),
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
      ...(input.newsletter === undefined
        ? {}
        : {
            newsletter: (input.newsletter
              ? { ...input.newsletter }
              : null) as unknown as Record<string, unknown>,
          }),
    }
    if (!existing) {
      const [created] = await this.createHomepageContents(
        [{ key: MAIN_HOMEPAGE_KEY, ...body }],
        sharedContext
      )
      return created
    }
    /*
      A TEXT KEY LEFT OUT OF THE SAVE HAS TO LEAVE THE RECORD (card 2ef36b38). An update merges `texts`, so the record is replaced
      instead: the old row is soft-deleted and a new one created in the same transaction (the unique index is partial, `deleted_at IS
      NULL`, as the payment matrix's replace does). What an absent field means, "keeps the stored value", is carried over from the old row
      into the new one; `slides` and `texts` are always sent.
    */
    if (removedTextKeys(existing.texts, input.texts).length) {
      const kept = Object.fromEntries(
        (
          [
            "featured_handles",
            "featured_brand_handles",
            "blocks",
            "footer",
            "newsletter",
          ] as const
        ).map((field) => [field, existing[field] ?? null])
      )
      await this.softDeleteHomepageContents([existing.id], {}, sharedContext)
      const [replaced] = await this.createHomepageContents(
        [{ key: MAIN_HOMEPAGE_KEY, ...kept, ...body }],
        sharedContext
      )
      return replaced
    }
    const [updated] = await this.updateHomepageContents(
      [{ id: existing.id, ...body }],
      sharedContext
    )
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
