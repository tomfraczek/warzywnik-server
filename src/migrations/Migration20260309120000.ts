import { Migration } from '@mikro-orm/migrations';

export class Migration20260309120000 extends Migration {
  up(): void {
    this.addSql(`
      create table "harvest_results" (
        "id" uuid not null default gen_random_uuid(),
        "planting_id" uuid not null,
        "harvested_at" timestamptz null,
        "yield_kg" numeric null,
        "quality_rating" int null,
        "notes" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "harvest_results_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      alter table "harvest_results"
        add constraint "harvest_results_planting_id_foreign"
        foreign key ("planting_id") references "plantings" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create index "harvest_results_planting_id_index"
        on "harvest_results" ("planting_id");
    `);

    this.addSql(`
      create index "harvest_results_planting_id_harvested_at_index"
        on "harvest_results" ("planting_id", "harvested_at");
    `);
  }

  down(): void {
    this.addSql(`drop table if exists "harvest_results" cascade;`);
  }
}
