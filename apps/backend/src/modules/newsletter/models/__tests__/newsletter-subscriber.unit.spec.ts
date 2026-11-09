import { readFileSync, readdirSync } from "fs"
import { join } from "path"

import NewsletterSubscriber from "../newsletter-subscriber"

/** The model, without a database (same placement reason as the landing page test). */
describe("newsletter subscriber model", () => {
  it("NL-MODEL: the address, the name and the consent as given, unique by address among the live rows", () => {
    const parsed = NewsletterSubscriber.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
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
      "name",
      "source",
      "status",
      "unsubscribe_token",
      "unsubscribed_at",
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

  it("NL-MODEL-OPTIN: the double opt-in's columns are in a migration, and the rows before it are pending, not confirmed", () => {
    const dir = join(__dirname, "../../migrations")
    const sql = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf-8"))
      .join("\n")
    expect(sql).toMatch(/add column if not exists "status" text not null default 'pending'/)
    for (const column of [
      "confirmation_token_hash",
      "confirmation_sent_at",
      "confirmed_at",
      "unsubscribe_token",
      "unsubscribed_at",
    ])
      expect([column, new RegExp(`add column if not exists "${column}" `).test(sql)]).toEqual([column, true])
    // a link's token is looked up by its own unique index
    for (const index of ["confirmation_token_hash", "unsubscribe_token"]) {
      const found = NewsletterSubscriber.parse().indexes.find(
        (i) => JSON.stringify(i.on) === JSON.stringify([index])
      )
      expect([index, found?.unique]).toEqual([index, true])
    }
  })
})
