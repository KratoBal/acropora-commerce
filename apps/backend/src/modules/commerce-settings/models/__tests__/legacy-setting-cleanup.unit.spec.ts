import {
  COMMERCE_SETTING_KEYS,
  LEGACY_COMMERCE_SETTING_KEYS,
} from "../../definitions"
import { Migration20261028180000 } from "../../migrations/Migration20261028180000"

/**
 * THE CLEANUP OF THE OLD `free_shipping_threshold_huf` ROW (task
 * commerce-szallitas-kuszob). What turns this red: the migration deleting a live
 * setting (or every row), or leaving the old key behind; a live key listed as
 * legacy; the migration doing anything on the way down.
 *
 * The migration is instantiated without a database: its `addSql` is replaced by
 * a collector, so the SQL it WOULD run is what is asserted.
 */
async function statements(direction: "up" | "down"): Promise<string[]> {
  const sql: string[] = []
  const migration = Object.create(Migration20261028180000.prototype) as {
    addSql: (statement: string) => void
    up: () => Promise<void>
    down: () => Promise<void>
  }
  migration.addSql = (statement) => void sql.push(statement)
  await migration[direction]()
  return sql
}

describe("legacy commerce setting cleanup", () => {
  it("lists the old single threshold and no live key", () => {
    expect(LEGACY_COMMERCE_SETTING_KEYS).toEqual(["free_shipping_threshold_huf"])
    for (const key of LEGACY_COMMERCE_SETTING_KEYS)
      expect(COMMERCE_SETTING_KEYS as readonly string[]).not.toContain(key)
  })

  it("deletes only the legacy key, by exact name", async () => {
    const sql = await statements("up")
    expect(sql).toEqual([
      `delete from "commerce_setting" where "key" in ('free_shipping_threshold_huf');`,
    ])
    // the per-carrier keys share the legacy key's prefix: they must stay
    for (const key of COMMERCE_SETTING_KEYS)
      expect(sql.join("\n")).not.toContain(`'${key}'`)
    expect(sql[0]).not.toMatch(/like/i)
  })

  it("every key the migration deletes is on the legacy list", async () => {
    const [statement] = await statements("up")
    const deleted = [...statement!.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
    expect(deleted.length).toBeGreaterThan(0)
    for (const key of deleted)
      expect(LEGACY_COMMERCE_SETTING_KEYS as readonly string[]).toContain(key)
  })

  it("does nothing on the way down", async () => {
    expect(await statements("down")).toEqual([])
  })
})
