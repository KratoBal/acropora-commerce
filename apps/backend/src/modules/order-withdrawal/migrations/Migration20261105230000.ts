import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * One row per withdrawn line with a UNIQUE (order_id, item_id): the database refuses a second declaration for a line.
 * The declarations that already exist (the test shop's) are copied in line by line; `on conflict do nothing` keeps the
 * migration from failing on a line that two old declarations both carry (the old race could leave both standing): the
 * first one claims it, the other stays as a declaration without the claim, which is how it was before.
 */
export class Migration20261105230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_withdrawal_item" ("id" text not null, "withdrawal_id" text not null, "order_id" text not null, "item_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_withdrawal_item_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_withdrawal_item_deleted_at" ON "order_withdrawal_item" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_withdrawal_item_order_item" ON "order_withdrawal_item" ("order_id", "item_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_withdrawal_item_withdrawal_id" ON "order_withdrawal_item" ("withdrawal_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `insert into "order_withdrawal_item" ("id", "withdrawal_id", "order_id", "item_id", "created_at") select 'ordwdi_' || md5(w."id" || '/' || u."item_id"), w."id", w."order_id", u."item_id", w."created_at" from "order_withdrawal" w, unnest(w."item_ids") as u("item_id") where w."deleted_at" is null order by w."created_at", w."id" on conflict do nothing;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_withdrawal_item" cascade;`)
  }
}
