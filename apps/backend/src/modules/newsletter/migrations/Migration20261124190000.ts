import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * WHAT BECAME OF THE CONFIRMATION MAIL (task hirlevel-level-eredmeny-20261124): the result of the last send and when. Both
 * nullable and additive: the rows before this have no result and cool down as they always did.
 */
export class Migration20261124190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" add column if not exists "confirmation_mail_result" text null, add column if not exists "confirmation_mail_result_at" timestamptz null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "newsletter_subscriber" drop column if exists "confirmation_mail_result", drop column if exists "confirmation_mail_result_at";`
    )
  }
}
