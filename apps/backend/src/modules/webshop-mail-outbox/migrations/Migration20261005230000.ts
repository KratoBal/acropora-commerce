import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261005230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "webshop_mail_outbox" ("id" text not null, "template" text not null, "facts" jsonb not null, "facts_version" integer not null, "to" text not null, "resource_id" text not null, "idempotency_key" text not null, "trigger_type" text null, "attempts" integer not null default 0, "next_attempt_at" timestamptz null, "failure_kind" text null, "last_error" text null, "sent_at" timestamptz null, "alerted_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webshop_mail_outbox_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_webshop_mail_outbox_deleted_at" ON "webshop_mail_outbox" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webshop_mail_outbox_idempotency_key_unique" ON "webshop_mail_outbox" ("idempotency_key") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_webshop_mail_outbox_sent_at_next_attempt_at" ON "webshop_mail_outbox" ("sent_at", "next_attempt_at") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "webshop_mail_outbox" cascade;`)
  }
}
