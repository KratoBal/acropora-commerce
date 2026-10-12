import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261012200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "landing_page" ("id" text not null, "os_landing_id" text not null, "handle" text not null, "title" text not null, "seo_title" text null, "meta_description" text null, "intro" text null, "filter" jsonb not null, "is_published" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_page_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_landing_page_deleted_at" ON "landing_page" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_landing_page_os_landing_id_unique" ON "landing_page" ("os_landing_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_landing_page_handle_unique" ON "landing_page" ("handle") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "landing_page" cascade;`)
  }
}
