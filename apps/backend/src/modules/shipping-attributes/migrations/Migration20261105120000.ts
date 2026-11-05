import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261105120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" add column if not exists "livestock_kind" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" drop column if exists "livestock_kind";`);
  }

}
