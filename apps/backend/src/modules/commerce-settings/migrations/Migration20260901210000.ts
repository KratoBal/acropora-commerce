import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260901210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "shipping_payment_rule" drop constraint if exists "shipping_payment_rule_pair_unique";`,
    );
    this.addSql(
      `create table if not exists "shipping_payment_rule" ("id" text not null, "shipping_role" text not null, "payment_role" text not null, "position" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_payment_rule_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_shipping_payment_rule_deleted_at" ON "shipping_payment_rule" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shipping_payment_rule_pair_unique" ON "shipping_payment_rule" ("shipping_role", "payment_role") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_payment_rule" cascade;`);
  }
}
