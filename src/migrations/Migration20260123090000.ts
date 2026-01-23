import { Migration } from '@mikro-orm/migrations';

export class Migration20260123090000 extends Migration {
  up(): void {
    this.addSql('create extension if not exists "pgcrypto";');

    this.addSql(`create table "pests" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(80) not null,
      "name" varchar(120) not null,
      "description" text not null,
      "symptoms" text null,
      "prevention" text null,
      "treatment" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "pests_pkey" primary key ("id")
    );`);
    this.addSql('create unique index "pests_slug_unique" on "pests" ("slug");');

    this.addSql(`create table "diseases" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(80) not null,
      "name" varchar(120) not null,
      "description" text not null,
      "symptoms" text null,
      "prevention" text null,
      "treatment" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "diseases_pkey" primary key ("id")
    );`);
    this.addSql(
      'create unique index "diseases_slug_unique" on "diseases" ("slug");',
    );

    this.addSql(`create table "vegetables" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(80) not null,
      "name" varchar(120) not null,
      "latin_name" varchar(160) null,
      "image_url" varchar(255) null,
      "description" text not null,
      "sun_exposure" text null,
      "water_demand" text null,
      "soil_type" text null,
      "soil_ph_min" double precision null,
      "soil_ph_max" double precision null,
      "nutrient_demand" text null,
      "sowing_methods" jsonb null,
      "time_to_harvest_days_min" int null,
      "time_to_harvest_days_max" int null,
      "succession_sowing" boolean not null default false,
      "succession_interval_days" int null,
      "harvest_start_month" text null,
      "harvest_end_month" text null,
      "harvest_signs" text null,
      "fertilization_stages" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "vegetables_pkey" primary key ("id")
    );`);
    this.addSql(
      'create unique index "vegetables_slug_unique" on "vegetables" ("slug");',
    );

    this.addSql(`create table "vegetables_pests" (
      "vegetable_id" uuid not null,
      "pest_id" uuid not null,
      constraint "vegetables_pests_pkey" primary key ("vegetable_id", "pest_id"),
      constraint "vegetables_pests_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete cascade,
      constraint "vegetables_pests_pest_id_foreign" foreign key ("pest_id") references "pests" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table "vegetables_diseases" (
      "vegetable_id" uuid not null,
      "disease_id" uuid not null,
      constraint "vegetables_diseases_pkey" primary key ("vegetable_id", "disease_id"),
      constraint "vegetables_diseases_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete cascade,
      constraint "vegetables_diseases_disease_id_foreign" foreign key ("disease_id") references "diseases" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table "vegetables_good_companions" (
      "vegetable_id" uuid not null,
      "companion_id" uuid not null,
      constraint "vegetables_good_companions_pkey" primary key ("vegetable_id", "companion_id"),
      constraint "vegetables_good_companions_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete cascade,
      constraint "vegetables_good_companions_companion_id_foreign" foreign key ("companion_id") references "vegetables" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table "vegetables_bad_companions" (
      "vegetable_id" uuid not null,
      "companion_id" uuid not null,
      constraint "vegetables_bad_companions_pkey" primary key ("vegetable_id", "companion_id"),
      constraint "vegetables_bad_companions_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete cascade,
      constraint "vegetables_bad_companions_companion_id_foreign" foreign key ("companion_id") references "vegetables" ("id") on update cascade on delete cascade
    );`);
  }

  down(): void {
    this.addSql('drop table if exists "vegetables_bad_companions" cascade;');
    this.addSql('drop table if exists "vegetables_good_companions" cascade;');
    this.addSql('drop table if exists "vegetables_diseases" cascade;');
    this.addSql('drop table if exists "vegetables_pests" cascade;');
    this.addSql('drop table if exists "vegetables" cascade;');
    this.addSql('drop table if exists "diseases" cascade;');
    this.addSql('drop table if exists "pests" cascade;');
  }
}
