import { Migration } from '@mikro-orm/migrations';

export class Migration20260212120000 extends Migration {
  up(): void {
    this.addSql(`alter table "users" add column "avatar_id" varchar(32) null;`);
    this.addSql(
      `alter table "users" add column "theme_mode" varchar(16) not null default 'system';`,
    );
    this.addSql(
      `alter table "users" add column "language" varchar(16) not null default 'system';`,
    );
    this.addSql(
      `alter table "users" add column "temperature_unit" varchar(4) not null default 'c';`,
    );
    this.addSql(
      `alter table "users" add column "precipitation_unit" varchar(4) not null default 'mm';`,
    );
    this.addSql(
      `alter table "users" add column "area_unit" varchar(4) not null default 'm2';`,
    );
    this.addSql(
      `alter table "users" add column "location_mode" varchar(16) not null default 'none';`,
    );
    this.addSql(
      `alter table "users" add column "location_label" varchar(200) null;`,
    );
    this.addSql(
      `alter table "users" add column "location_lat" double precision null;`,
    );
    this.addSql(
      `alter table "users" add column "location_lon" double precision null;`,
    );
    this.addSql(
      `alter table "users" add column "location_updated_at" timestamptz null;`,
    );
  }

  down(): void {
    this.addSql(`alter table "users" drop column "location_updated_at";`);
    this.addSql(`alter table "users" drop column "location_lon";`);
    this.addSql(`alter table "users" drop column "location_lat";`);
    this.addSql(`alter table "users" drop column "location_label";`);
    this.addSql(`alter table "users" drop column "location_mode";`);
    this.addSql(`alter table "users" drop column "area_unit";`);
    this.addSql(`alter table "users" drop column "precipitation_unit";`);
    this.addSql(`alter table "users" drop column "temperature_unit";`);
    this.addSql(`alter table "users" drop column "language";`);
    this.addSql(`alter table "users" drop column "theme_mode";`);
    this.addSql(`alter table "users" drop column "avatar_id";`);
  }
}
