import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261105200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_withdrawal" ("id" text not null, "order_id" text not null, "customer_name" text not null, "item_ids" text[] not null, "status" text not null default 'new', "pulled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_withdrawal_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_withdrawal_deleted_at" ON "order_withdrawal" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_withdrawal_order_id" ON "order_withdrawal" ("order_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_withdrawal_status" ON "order_withdrawal" ("status") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_withdrawal" cascade;`)
  }
}
