import { readFileSync, readdirSync } from "fs"
import { join } from "path"

import NewsletterSubscriber from "../newsletter-subscriber"

/** The model, without a database (same placement reason as the landing page test). */
describe("newsletter subscriber model", () => {
  it("NL-MODEL: the address, the name and the consent as given, unique by address among the live rows", () => {
    const parsed = NewsletterSubscriber.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "consent_language",
      "consent_text",
      "consent_version",
      "consented_at",
      "created_at",
      "deleted_at",
      "email",
      "id",
      "name",
      "source",
      "updated_at",
    ])
    const unique = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["email"])
    )
    expect(unique?.unique).toBe(true)
    expect(String(unique?.where)).toContain("deleted_at IS NULL")
  })

  it("NL-MODEL-LANG: the language column is in a migration, not null, and the rows before it are Hungarian", () => {
    const dir = join(__dirname, "../../migrations")
    const sql = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf-8"))
      .join("\n")
    expect(sql).toMatch(
      /add column if not exists "consent_language" text not null default 'hu'/
    )
  })
})
