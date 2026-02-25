import { Migration } from '@mikro-orm/migrations';

export class Migration20260225120000 extends Migration {
  up(): void {
    this.addSql(
      `create type "locations_mode_enum" as enum ('MANUAL', 'DEVICE');`,
    );
    this.addSql(`create type "locations_provider_enum" as enum ('NOMINATIM');`);

    this.addSql(
      `create table "locations" ("id" uuid not null default gen_random_uuid(), "mode" "locations_mode_enum" not null, "label" varchar(255) not null, "lat" double precision not null, "lon" double precision not null, "accuracy_m" double precision null, "provider" "locations_provider_enum" not null default 'NOMINATIM', "provider_place_id" varchar(120) null, "manual_query" varchar(200) null, "updated_at" timestamptz not null default now(), "created_at" timestamptz not null default now(), constraint "locations_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "geo_cache_entries" ("cache_key" varchar(255) not null, "payload" text not null, "expires_at" timestamptz not null, "updated_at" timestamptz not null default now(), constraint "geo_cache_entries_pkey" primary key ("cache_key"));`,
    );
    this.addSql(
      `create index "geo_cache_entries_expires_at_index" on "geo_cache_entries" ("expires_at");`,
    );

    this.addSql(`alter table "users" add column "location_id" uuid null;`);
    this.addSql(
      `alter table "users" add constraint "users_location_id_foreign" foreign key ("location_id") references "locations" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `create unique index "users_location_id_unique" on "users" ("location_id") where "location_id" is not null;`,
    );
  }

  down(): void {
    this.addSql(`drop index if exists "users_location_id_unique";`);
    this.addSql(
      `alter table "users" drop constraint if exists "users_location_id_foreign";`,
    );
    this.addSql(`alter table "users" drop column if exists "location_id";`);

    this.addSql(`drop table if exists "geo_cache_entries" cascade;`);
    this.addSql(`drop table if exists "locations" cascade;`);
    this.addSql(`drop type if exists "locations_provider_enum";`);
    this.addSql(`drop type if exists "locations_mode_enum";`);
  }
}
