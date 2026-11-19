import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Gift cards and their ledger (card 495c0007). Only the class is exported: Medusa's migrator loads the first export. */
export class Migration20261119030000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "gift_card" ("id" text not null, "code_hash" text not null, "code_last4" text not null, "currency_code" text not null default 'huf', "initial_amount" integer not null, "balance" integer not null, "status" text not null default 'active', "expires_at" timestamptz null, "recipient_email" text null, "note" text null, "issued_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gift_card_pkey" primary key ("id"), constraint "gift_card_balance_check" check ("balance" >= 0));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_deleted_at" ON "gift_card" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_code_hash_unique" ON "gift_card" ("code_hash") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `create table if not exists "gift_card_transaction" ("id" text not null, "gift_card_id" text not null, "kind" text not null, "amount" integer not null, "balance_after" integer not null, "reference" text null, "idempotency_key" text null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gift_card_transaction_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_transaction_deleted_at" ON "gift_card_transaction" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_transaction_card" ON "gift_card_transaction" ("gift_card_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_transaction_redeem_unique" ON "gift_card_transaction" ("gift_card_id", "reference") WHERE deleted_at IS NULL AND kind = 'redeem' AND reference IS NOT NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_transaction_idempotency_key_unique" ON "gift_card_transaction" ("idempotency_key") WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "gift_card_transaction" cascade;`)
    this.addSql(`drop table if exists "gift_card" cascade;`)
  }
}
