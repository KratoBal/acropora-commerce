import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * THE ARRIVAL ("Szólj, ha jön hasonló", V2.4, card 0c1265d2): what a confirmed row had already seen buyable, and when
 * (and about which product) it was told. Every row before this was never told, and has no sweep behind it: null is the
 * true value for all three.
 */
export class Migration20261109200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "stock_alert_subscription" add column if not exists "known_available" jsonb null, add column if not exists "notified_at" timestamptz null, add column if not exists "notified_product_id" text null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "stock_alert_subscription" drop column if exists "known_available", drop column if exists "notified_at", drop column if exists "notified_product_id";`,
    )
  }
}
