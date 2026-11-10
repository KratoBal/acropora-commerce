import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** V2.6 S4a (card f4e4832b): the live animals on their way, as the Acropora OS publishes them. */
export class Migration20261110120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "livestock_arrival" ("id" text not null, "os_id" text not null, "kind" text not null, "label" text not null, "expected_on" text not null, "status" text not null, "medusa_product_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "livestock_arrival_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_livestock_arrival_deleted_at" ON "livestock_arrival" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_livestock_arrival_os_id_unique" ON "livestock_arrival" ("os_id") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "livestock_arrival" cascade;`)
  }
}
