import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261027090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" add column if not exists "featured_brand_handles" jsonb null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" drop column if exists "featured_brand_handles";`,
    )
  }
}
