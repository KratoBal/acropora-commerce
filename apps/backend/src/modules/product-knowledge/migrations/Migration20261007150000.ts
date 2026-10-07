import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * SEO P0 PR 2c: the OS definition's `public` flag on a projected fact. Default
 * false, so an existing row stays hidden on the store route until the next
 * knowledge projection writes it with the flag (the brief: a full knowledge
 * re-projection right after the deploy).
 */
export class Migration20261007150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_knowledge_fact" add column if not exists "public" boolean not null default false;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "product_knowledge_fact" drop column if exists "public";`,
    )
  }
}
