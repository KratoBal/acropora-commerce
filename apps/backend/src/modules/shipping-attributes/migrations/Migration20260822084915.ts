import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260822084915 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" drop constraint if exists "shipping_attribute_product_id_unique";`);
    this.addSql(`create table if not exists "shipping_attribute" ("id" text not null, "product_id" text not null, "pickup_only" boolean not null default false, "foxpost_forbidden" boolean not null default false, "is_frozen" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_attribute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_attribute_deleted_at" ON "shipping_attribute" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shipping_attribute_product_id_unique" ON "shipping_attribute" ("product_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_attribute" cascade;`);
  }

}
