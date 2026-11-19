import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * The loyalty ledger (card dfb79916): one row per movement of a customer's points. The two checks are the database's own
 * backstop under the service: a zero movement and an unknown kind are refused whatever wrote the row.
 */
export class Migration20261119010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "loyalty_entry" ("id" text not null, "customer_id" text not null, "kind" text not null, "points" integer not null, "order_id" text null, "reference" text null, "reason" text not null, "actor" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_entry_pkey" primary key ("id"), constraint "loyalty_entry_points_not_zero" check ("points" <> 0), constraint "loyalty_entry_kind_known" check ("kind" in ('accrual', 'redemption', 'adjustment', 'reversal')));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_loyalty_entry_deleted_at" ON "loyalty_entry" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_loyalty_entry_customer_id" ON "loyalty_entry" ("customer_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_entry_reference" ON "loyalty_entry" ("reference") WHERE reference IS NOT NULL AND deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "loyalty_entry" cascade;`)
  }
}
