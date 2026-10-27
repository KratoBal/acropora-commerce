import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261027110100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" add column if not exists "newsletter" jsonb null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" drop column if exists "newsletter";`,
    )
  }
}
