import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261008000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "url_redirect" ("id" text not null, "source_path" text not null, "source_path_lower" text not null, "destination_path" text not null, "status" integer not null default 301, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "url_redirect_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_url_redirect_deleted_at" ON "url_redirect" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_url_redirect_source_path_lower_unique" ON "url_redirect" ("source_path_lower") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "url_redirect" cascade;`);
  }
}
