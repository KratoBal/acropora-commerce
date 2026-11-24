import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261124150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_text" ("id" text not null, "key" text not null, "locale" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_text_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_text_deleted_at" ON "customer_text" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_text_key_locale_unique" ON "customer_text" ("key", "locale") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_text" cascade;`)
  }
}
