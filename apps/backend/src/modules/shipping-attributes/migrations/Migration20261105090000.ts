import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261105090000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" add column if not exists "locker_unsuitable" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "shipping_attribute" drop column if exists "locker_unsuitable";`);
  }

}
