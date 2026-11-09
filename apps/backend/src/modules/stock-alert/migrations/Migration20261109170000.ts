import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** "Szólj, ha jön hasonló" (V2.4, card 0c1265d2): the stock alert sign-ups, with the newsletter's double opt-in. */
export class Migration20261109170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "stock_alert_subscription" ("id" text not null, "email" text not null, "subject_kind" text not null, "subject_key" text not null, "subject_label" text not null, "source_product_id" text null, "consent_text" text not null, "consent_version" text not null, "consent_language" text not null default 'hu', "consented_at" timestamptz not null, "source" text not null, "status" text not null default 'pending', "confirmation_token_hash" text null, "confirmation_sent_at" timestamptz null, "confirmed_at" timestamptz null, "unsubscribe_token" text null, "unsubscribed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_alert_subscription_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_deleted_at" ON "stock_alert_subscription" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_email_subject_unique" ON "stock_alert_subscription" ("email", "subject_kind", "subject_key") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_subject" ON "stock_alert_subscription" ("subject_kind", "subject_key") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_confirmation_token_hash" ON "stock_alert_subscription" ("confirmation_token_hash") WHERE deleted_at IS NULL AND confirmation_token_hash IS NOT NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_unsubscribe_token" ON "stock_alert_subscription" ("unsubscribe_token") WHERE deleted_at IS NULL AND unsubscribe_token IS NOT NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_alert_subscription" cascade;`)
  }
}
