import { Migration } from '@mikro-orm/migrations';

export class Migration20260123110000 extends Migration {
  up(): void {
    this.addSql(`create table "soils" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(80) not null,
      "name" varchar(120) not null,
      "description" text not null,
      "soil_type" text not null,
      "structure" text not null,
      "water_retention" text not null,
      "drainage" text not null,
      "ph_min" double precision null,
      "ph_max" double precision null,
      "fertility_level" text not null,
      "advantages" jsonb not null,
      "disadvantages" jsonb not null,
      "improvement_tips" jsonb not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "soils_pkey" primary key ("id")
    );`);
    this.addSql('create unique index "soils_slug_unique" on "soils" ("slug");');
  }

  down(): void {
    this.addSql('drop table if exists "soils" cascade;');
  }
}
