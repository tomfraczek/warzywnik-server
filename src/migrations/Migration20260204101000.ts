import { Migration } from '@mikro-orm/migrations';

export class Migration20260204101000 extends Migration {
  up(): void {
    this.addSql(`create table "plantings" (
      "id" uuid not null default gen_random_uuid(),
      "user_id" uuid not null,
      "bed_id" uuid not null,
      "vegetable_id" uuid not null,
      "planned_start_date" timestamptz not null,
      "actual_start_date" timestamptz null,
      "status" text not null default 'PLANNED',
      "notes" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "plantings_pkey" primary key ("id")
    );`);

    this.addSql(
      `alter table "plantings" add constraint "plantings_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "plantings" add constraint "plantings_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "plantings" add constraint "plantings_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade;`,
    );

    this.addSql(
      `create index "idx_plantings_user_id" on "plantings" ("user_id");`,
    );
    this.addSql(
      `create index "idx_plantings_bed_id" on "plantings" ("bed_id");`,
    );
    this.addSql(
      `create index "idx_plantings_vegetable_id" on "plantings" ("vegetable_id");`,
    );
    this.addSql(
      `create index "idx_plantings_status" on "plantings" ("status");`,
    );
    this.addSql(
      `create index "idx_plantings_planned_start_date" on "plantings" ("planned_start_date");`,
    );
  }

  down(): void {
    this.addSql('drop table if exists "plantings" cascade;');
  }
}
