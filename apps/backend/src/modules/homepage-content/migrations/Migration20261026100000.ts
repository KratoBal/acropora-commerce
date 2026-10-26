import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261026100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" add column if not exists "blocks" jsonb null;`,
    )
    this.addSql(
      `alter table if exists "homepage_content" add column if not exists "footer" jsonb null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" drop column if exists "footer";`,
    )
    this.addSql(
      `alter table if exists "homepage_content" drop column if exists "blocks";`,
    )
  }
}
