import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260822114014 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "commerce_setting" drop constraint if exists "commerce_setting_key_unique";`,
    );
    this.addSql(
      `create table if not exists "commerce_setting" ("id" text not null, "key" text not null, "value" text not null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "commerce_setting_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_commerce_setting_deleted_at" ON "commerce_setting" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_commerce_setting_key_unique" ON "commerce_setting" ("key") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "commerce_setting" cascade;`);
  }
}
