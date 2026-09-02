import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260902120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_business_status" ("id" text not null, "order_id" text not null, "status" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_business_status_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_business_status_deleted_at" ON "order_business_status" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_business_status_order_id_unique" ON "order_business_status" ("order_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `create table if not exists "order_business_status_history" ("id" text not null, "order_id" text not null, "from_status" text null, "to_status" text not null, "actor" text not null, "source" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_business_status_history_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_business_status_history_deleted_at" ON "order_business_status_history" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_business_status_history_order_id" ON "order_business_status_history" ("order_id") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_business_status_history" cascade;`)
    this.addSql(`drop table if exists "order_business_status" cascade;`)
  }
}
