import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261110140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" add column if not exists "pickup_only_derived" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" drop column if exists "pickup_only_derived";`);
  }

}
