import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261012170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "brand" ("id" text not null, "os_brand_id" text not null, "name" text not null, "handle" text not null, "description" text null, "intro" text null, "seo_title" text null, "meta_description" text null, "logo_url" text null, "website_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_os_brand_id_unique" ON "brand" ("os_brand_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" ("handle") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `create table if not exists "product_brand" ("id" text not null, "product_id" text not null, "os_brand_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_brand_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_brand_deleted_at" ON "product_brand" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_brand_product_id_unique" ON "product_brand" ("product_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_brand_os_brand_id" ON "product_brand" ("os_brand_id") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_brand" cascade;`)
    this.addSql(`drop table if exists "brand" cascade;`)
  }
}
