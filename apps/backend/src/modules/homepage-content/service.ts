import { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
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
      A TEXT KEY LEFT OUT OF THE SAVE HAS TO LEAVE THE RECORD (card 2ef36b38). An update merges `texts` (the ORM assigns with
      `mergeObjectProperties: true`), so the texts are written by ONE raw UPDATE on the transaction's connection: no ORM merge, and no
      delete-and-create of the same `key` against the partial unique index (the ORM can put the insert before the update in one unit of
      work, which refused every save on a real database in #804; the payment matrix, the points ledger and the gift cards write raw for
      the same reason). The id does not change. Every other field keeps the plain update, and the ORM update does not carry `texts` in
      this case, so nothing stale is flushed over the raw write.
    */
    const removed = removedTextKeys(existing.texts, input.texts).length > 0
    const { texts, ...others } = body
    const [updated] = await this.updateHomepageContents(
      [{ id: existing.id, ...(removed ? others : body) }],
      sharedContext
    )
    if (!removed) return updated
    await this.knexOf(sharedContext).raw(
      "update homepage_content set texts = ?::jsonb, updated_at = now() where id = ? and deleted_at is null",
      [JSON.stringify(texts), existing.id]
    )
    /*
      THE ANSWER IS READ BACK BY A RAW SELECT on the same connection (barracuda #839): a read through the module goes by the ORM's identity
      map, which can hand back the entity loaded at the top of this call, with the old `texts` (the removed key still in it). An editor that
      refreshed its form from that answer would write the key back on its next save.
    */
    const read = await this.knexOf(sharedContext).raw(
      "select * from homepage_content where id = ? and deleted_at is null",
      [existing.id]
    )
    return read.rows[0]
  }

  /** The transaction's connection, or a refusal: the texts are replaced only inside one. */
  private knexOf(sharedContext: Context): {
    raw(
      sql: string,
      bindings: unknown[]
    ): Promise<{ rows: Record<string, unknown>[] }>
  } {
    const knex = (
      sharedContext.transactionManager as
        | {
            getTransactionContext(): {
              raw(
                sql: string,
                bindings: unknown[]
              ): Promise<{ rows: Record<string, unknown>[] }>
            } | undefined
          }
        | undefined
    )?.getTransactionContext()
    if (!knex)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The home page texts are replaced only inside a transaction."
      )
    return knex
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
