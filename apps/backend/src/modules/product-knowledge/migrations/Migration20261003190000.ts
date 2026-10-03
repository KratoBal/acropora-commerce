import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261003190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "product_knowledge_fact" ("id" text not null, "product_id" text not null, "field" text not null, "value" text null, "unit" text null, "status" text not null, "source_type" text null, "revision" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_knowledge_fact_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_knowledge_fact_deleted_at" ON "product_knowledge_fact" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_knowledge_fact_product_id_field_unique" ON "product_knowledge_fact" ("product_id", "field") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `create table if not exists "product_knowledge_copy" ("id" text not null, "product_id" text not null, "block" text not null, "body" text not null, "revision" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_knowledge_copy_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_knowledge_copy_deleted_at" ON "product_knowledge_copy" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_knowledge_copy_product_id_block_unique" ON "product_knowledge_copy" ("product_id", "block") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_knowledge_copy" cascade;`)
    this.addSql(`drop table if exists "product_knowledge_fact" cascade;`)
  }
}
