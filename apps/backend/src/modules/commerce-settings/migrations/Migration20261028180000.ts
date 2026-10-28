import { Migration } from "@medusajs/framework/mikro-orm/migrations"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * THIS MIGRATION CARRIES ITS OWN KEY LIST ON PURPOSE. A migration that has run
 * never runs again, so it must not import `LEGACY_COMMERCE_SETTING_KEYS`: a key
 * added to that list later would silently NOT be deleted on a database that
 * already ran this file. A new legacy key gets its own new migration.
 */
const KEYS_DELETED_HERE = ["free_shipping_threshold_huf"] as const

/**
 * Deletes the rows stored under keys the code no longer knows (today only
 * `free_shipping_threshold_huf`, replaced by the per-carrier thresholds on
 * 2026-10-28). The Admin cannot remove an unknown key, and the row is ignored by
 * the accessor, so this is cleanup, not a behaviour change.
 *
 * Hard delete on purpose: a soft-deleted row would still occupy the key's
 * history for nothing. The keys come from a fixed list of plain names (checked
 * below), never from data.
 */
export class Migration20261028180000 extends Migration {
  override async up(): Promise<void> {
    const keys = KEYS_DELETED_HERE.map((key) => {
      if (!/^[a-z0-9_]+$/.test(key))
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unexpected legacy setting key: ${key}`
        )
      return `'${key}'`
    })
    this.addSql(
      `delete from "commerce_setting" where "key" in (${keys.join(", ")});`
    )
  }

  /** The deleted values are not recoverable, and nothing reads them. */
  override async down(): Promise<void> {}
}
