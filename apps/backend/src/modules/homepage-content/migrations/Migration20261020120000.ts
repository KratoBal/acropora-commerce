import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261020120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "homepage_content" ("id" text not null, "key" text not null, "texts" jsonb not null, "slides" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_content_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_homepage_content_deleted_at" ON "homepage_content" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_homepage_content_key_unique" ON "homepage_content" ("key") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "homepage_content" cascade;`)
  }
}
