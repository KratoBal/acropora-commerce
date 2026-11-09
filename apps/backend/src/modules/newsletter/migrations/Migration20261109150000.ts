import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * DOUBLE OPT-IN (card d707cf5f): the row's status, the confirmation link's token hash and the leaving link's token, and the
 * three times. Every row before this was signed up in one step, never confirmed by the address's owner, so `pending` is the
 * true value for them; they have no tokens until they sign up again.
 */
export class Migration20261109150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" add column if not exists "status" text not null default 'pending', add column if not exists "confirmation_token_hash" text null, add column if not exists "confirmation_sent_at" timestamptz null, add column if not exists "confirmed_at" timestamptz null, add column if not exists "unsubscribe_token" text null, add column if not exists "unsubscribed_at" timestamptz null;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_confirmation_token_hash" ON "newsletter_subscriber" ("confirmation_token_hash") WHERE deleted_at IS NULL AND confirmation_token_hash IS NOT NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_unsubscribe_token" ON "newsletter_subscriber" ("unsubscribe_token") WHERE deleted_at IS NULL AND unsubscribe_token IS NOT NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_newsletter_subscriber_unsubscribe_token";`)
    this.addSql(`drop index if exists "IDX_newsletter_subscriber_confirmation_token_hash";`)
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop column if exists "status", drop column if exists "confirmation_token_hash", drop column if exists "confirmation_sent_at", drop column if exists "confirmed_at", drop column if exists "unsubscribe_token", drop column if exists "unsubscribed_at";`,
    )
  }
}
