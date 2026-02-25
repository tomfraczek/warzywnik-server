import { Migration } from '@mikro-orm/migrations';

export class Migration20260225153000 extends Migration {
  up(): void {
    this.addSql(`alter table "locations" drop column if exists "provider";`);
    this.addSql(
      `alter table "locations" drop column if exists "manual_query";`,
    );
    this.addSql(`drop type if exists "locations_provider_enum";`);
  }

  down(): void {
    this.addSql(
      `do $$
      begin
        if not exists (select 1 from pg_type where typname = 'locations_provider_enum') then
          create type "locations_provider_enum" as enum ('NOMINATIM');
        end if;
      end$$;`,
    );

    this.addSql(
      `alter table "locations" add column if not exists "provider" "locations_provider_enum" not null default 'NOMINATIM';`,
    );
    this.addSql(
      `alter table "locations" add column if not exists "manual_query" varchar(200) null;`,
    );
  }
}
