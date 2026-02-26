import { Migration } from '@mikro-orm/migrations';

export class Migration20260225170000 extends Migration {
  up(): void {
    this.addSql(
      `create type "weather_snapshots_provider_enum" as enum ('OPEN_METEO');`,
    );

    this.addSql(
      `create table "weather_snapshots" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "location_lat" double precision not null, "location_lon" double precision not null, "provider" "weather_snapshots_provider_enum" not null default 'OPEN_METEO', "fetched_at" timestamptz not null, "expires_at" timestamptz not null, "is_stale" boolean not null default false, "data" jsonb not null, "data_version" int not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "weather_snapshots_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "weather_snapshots" add constraint "weather_snapshots_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create unique index "weather_snapshots_user_id_unique" on "weather_snapshots" ("user_id");`,
    );
    this.addSql(
      `create index "weather_snapshots_user_id_index" on "weather_snapshots" ("user_id");`,
    );
    this.addSql(
      `create index "weather_snapshots_expires_at_index" on "weather_snapshots" ("expires_at");`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "weather_snapshots" cascade;`);
    this.addSql(`drop type if exists "weather_snapshots_provider_enum";`);
  }
}
