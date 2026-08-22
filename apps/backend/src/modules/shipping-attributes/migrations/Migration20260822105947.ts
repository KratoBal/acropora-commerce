import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260822105947 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" add column if not exists "is_heavy" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" drop column if exists "is_heavy";`);
  }

}
