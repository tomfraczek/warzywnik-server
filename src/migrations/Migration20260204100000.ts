import { Migration } from '@mikro-orm/migrations';

export class Migration20260204100000 extends Migration {
  up(): void {
    this.addSql(`create table "beds" (
      "id" uuid not null default gen_random_uuid(),
      "user_id" uuid not null,
      "name" varchar(120) not null,
      "description" text null,
      "location_label" varchar(120) null,
      "length_cm" int null,
      "width_cm" int null,
      "depth_cm" int null,
      "soil_id" uuid null,
      "soil_testing_enabled" boolean not null default false,
      "measured_n" int null,
      "measured_p" int null,
      "measured_k" int null,
      "measured_ph" double precision null,
      "is_active" boolean not null default true,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "beds_pkey" primary key ("id")
    );`);

    this.addSql(
      `alter table "beds" add constraint "beds_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "beds" add constraint "beds_soil_id_foreign" foreign key ("soil_id") references "soils" ("id") on update cascade on delete set null;`,
    );

    this.addSql(`create index "idx_beds_user_id" on "beds" ("user_id");`);
    this.addSql(`create index "idx_beds_is_active" on "beds" ("is_active");`);
  }

  down(): void {
    this.addSql('drop table if exists "beds" cascade;');
  }
}
