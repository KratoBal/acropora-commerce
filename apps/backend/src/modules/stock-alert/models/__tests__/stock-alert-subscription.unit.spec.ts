import { readFileSync, readdirSync } from "fs"
import { join } from "path"

import StockAlertSubscription from "../stock-alert-subscription"

/** The model and its migration, without a database (the newsletter model's spec, same reason). */
const migrations = () => {
  const dir = join(__dirname, "../../migrations")
  return readdirSync(dir)
    .map((f) => readFileSync(join(dir, f), "utf-8"))
    .join("\n")
}

describe("stock alert subscription model", () => {
  it("SA-MODEL: the address, the subject, the consent as given and the double opt-in's columns", () => {
    expect(Object.keys(StockAlertSubscription.parse().schema).sort()).toEqual([
      "confirmation_sent_at",
      "confirmation_token_hash",
      "confirmed_at",
      "consent_language",
      "consent_text",
      "consent_version",
      "consented_at",
      "created_at",
      "deleted_at",
      "email",
      "id",
      "source",
      "source_product_id",
      "status",
      "subject_key",
      "subject_kind",
      "subject_label",
      "unsubscribe_token",
      "unsubscribed_at",
      "updated_at",
    ])
  })

  it("SA-MODEL-UNIQUE: one live row per address and subject; a second species is a second row", () => {
    const indexes = StockAlertSubscription.parse().indexes
    const unique = indexes.find((i) => JSON.stringify(i.on) === JSON.stringify(["email", "subject_kind", "subject_key"]))
    expect(unique?.unique).toBe(true)
    expect(String(unique?.where)).toContain("deleted_at IS NULL")
    // an address alone is NOT unique: the same buyer may wait for two species
    expect(indexes.find((i) => JSON.stringify(i.on) === JSON.stringify(["email"]))).toBeUndefined()
    for (const token of ["confirmation_token_hash", "unsubscribe_token"]) {
      const found = indexes.find((i) => JSON.stringify(i.on) === JSON.stringify([token]))
      expect([token, found?.unique]).toEqual([token, true])
    }
  })

  it("SA-MODEL-MIGRATION: the migration creates every column and index the model declares, pending by default", () => {
    const sql = migrations()
    const parsed = StockAlertSubscription.parse()
    for (const column of Object.keys(parsed.schema))
      expect([column, sql.includes(`"${column}" `)]).toEqual([column, true])
    expect(sql).toMatch(/"status" text not null default 'pending'/)
    for (const index of parsed.indexes)
      expect([index.name, sql.includes(`"${index.name}"`)]).toEqual([index.name, true])
  })
})
