import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261104100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_problem_report" ("id" text not null, "order_id" text not null, "kind" text not null, "item_ids" text[] not null, "received_at" timestamptz null, "description" text not null, "phone" text null, "status" text not null default 'new', "pulled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_problem_report_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_report_deleted_at" ON "order_problem_report" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_report_order_id" ON "order_problem_report" ("order_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_report_status" ON "order_problem_report" ("status") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `create table if not exists "order_problem_image" ("id" text not null, "order_id" text not null, "report_id" text null, "file_key" text not null, "url" text not null, "mime_type" text not null, "size_bytes" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_problem_image_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_image_deleted_at" ON "order_problem_image" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_image_order_id" ON "order_problem_image" ("order_id") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_problem_image_report_id" ON "order_problem_image" ("report_id") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_problem_image" cascade;`)
    this.addSql(`drop table if exists "order_problem_report" cascade;`)
  }
}
