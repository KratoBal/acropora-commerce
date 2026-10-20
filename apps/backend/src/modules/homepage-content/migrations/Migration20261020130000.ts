import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261020130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "homepage_content" alter column "slides" drop not null;`,
    )
  }

  override async down(): Promise<void> {
    // a null would violate the old constraint: not-set becomes "no hero"
    this.addSql(
      `update "homepage_content" set "slides" = '[]'::jsonb where "slides" is null;`,
    )
    this.addSql(
      `alter table if exists "homepage_content" alter column "slides" set not null;`,
    )
  }
}
