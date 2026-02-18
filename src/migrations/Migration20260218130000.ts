import { Migration } from '@mikro-orm/migrations';

export class Migration20260218130000 extends Migration {
  up(): void {
    this.addSql(
      `create type "pest_occurrences_status_enum" as enum ('suspected', 'confirmed', 'resolved');`,
    );

    this.addSql(
      `create table "pest_occurrences" (
        "id" uuid not null default gen_random_uuid(),
        "bed_id" uuid not null,
        "pest_id" uuid not null,
        "status" "pest_occurrences_status_enum" not null,
        "notes" text null,
        "reminder_count" int not null default 0,
        "next_check_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "pest_occurrences_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `create index "pest_occurrences_bed_id_index" on "pest_occurrences" ("bed_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_pest_id_index" on "pest_occurrences" ("pest_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_status_index" on "pest_occurrences" ("status");`,
    );
    this.addSql(
      `create index "pest_occurrences_next_check_at_index" on "pest_occurrences" ("next_check_at");`,
    );
    this.addSql(
      `create unique index "pest_occurrences_active_unique" on "pest_occurrences" ("bed_id", "pest_id") where "status" <> 'resolved';`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_pest_id_foreign" foreign key ("pest_id") references "pests" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "planting_diseases" add column if not exists "reminder_count" int not null default 0;`,
    );
    this.addSql(
      `alter table "planting_diseases" add column if not exists "next_check_at" timestamptz null;`,
    );
    this.addSql(
      `create index if not exists "planting_diseases_next_check_at_index" on "planting_diseases" ("next_check_at");`,
    );

    this.addSql(
      `alter table "reminders" add column if not exists "pest_occurrence_id" uuid null;`,
    );
    this.addSql(
      `create index if not exists "reminders_pest_occurrence_id_index" on "reminders" ("pest_occurrence_id");`,
    );

    this.addSql(
      `do $$
      begin
        if not exists (
          select 1
          from pg_enum
          where enumlabel = 'PEST_CHECK'
            and enumtypid = (select oid from pg_type where typname = 'reminders_type_enum')
        ) then
          alter type "reminders_type_enum" add value 'PEST_CHECK';
        end if;
      end$$;`,
    );

    this.addSql(
      `update "planting_diseases" pd
       set reminder_count = 0,
           next_check_at = coalesce(
             (
               select min(r.scheduled_at)
               from reminders r
               where r.planting_disease_id = pd.id
                 and r.status in ('pending', 'processing')
             ),
             case
               when pd.status = 'confirmed' then now() + interval '2 days'
               else now() + interval '1 day'
             end
           )
       where pd.status in ('suspected', 'confirmed');`,
    );

    this.addSql(
      `update "planting_diseases"
       set reminder_count = 0,
           next_check_at = null
       where status = 'resolved';`,
    );

    this.addSql(
      `with ranked as (
        select id,
               planting_disease_id,
               row_number() over (partition by planting_disease_id order by scheduled_at asc) as rn
        from reminders
        where planting_disease_id is not null
          and status in ('pending', 'processing')
      )
      update reminders r
      set status = 'canceled'
      from ranked
      where r.id = ranked.id
        and ranked.rn > 1;`,
    );

    this.addSql(
      `update reminders r
       set scheduled_at = pd.next_check_at
       from planting_diseases pd
       where r.planting_disease_id = pd.id
         and r.status in ('pending', 'processing')
         and pd.next_check_at is not null;`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "pest_occurrences" cascade;`);
    this.addSql(`drop type if exists "pest_occurrences_status_enum";`);

    this.addSql(
      `drop index if exists "planting_diseases_next_check_at_index";`,
    );
    this.addSql(
      `alter table "planting_diseases" drop column if exists "next_check_at";`,
    );
    this.addSql(
      `alter table "planting_diseases" drop column if exists "reminder_count";`,
    );

    this.addSql(`drop index if exists "reminders_pest_occurrence_id_index";`);
    this.addSql(
      `alter table "reminders" drop column if exists "pest_occurrence_id";`,
    );

    this.addSql(
      `do $$
      begin
        if exists (select 1 from pg_type where typname = 'reminders_type_enum') then
          create type "reminders_type_enum_old" as enum ('DISEASE_CHECK', 'DISEASE_TREATMENT');
          alter table "reminders" alter column "type" type "reminders_type_enum_old" using "type"::text::"reminders_type_enum_old";
          drop type "reminders_type_enum";
          alter type "reminders_type_enum_old" rename to "reminders_type_enum";
        end if;
      end$$;`,
    );
  }
}
