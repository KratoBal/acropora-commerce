import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** The unique piece kept for one cart (V2.3, card 52024fc0): one row per variant. */
export class Migration20261109190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "cart_hold" ("id" text not null, "variant_id" text not null, "cart_id" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cart_hold_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_hold_deleted_at" ON "cart_hold" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cart_hold_variant_unique" ON "cart_hold" ("variant_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_hold_cart_id" ON "cart_hold" ("cart_id") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cart_hold" cascade;`)
  }
}
