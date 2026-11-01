import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * The language of the form a subscriber signed up in (`hu` or `en`). Every row before this migration was recorded with the Hungarian
 * consent text, so `hu` is the true value for them, and the column is not null from the start.
 */
export class Migration20261101220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" add column if not exists "consent_language" text not null default 'hu';`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop column if exists "consent_language";`,
    )
  }
}
