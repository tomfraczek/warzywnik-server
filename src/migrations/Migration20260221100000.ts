import { Migration } from '@mikro-orm/migrations';

export class Migration20260221100000 extends Migration {
  up(): void {
    this.addSql(`do $$
      begin
        if not exists (select 1 from pg_type where typname = 'plantings_start_method_enum') then
          create type "plantings_start_method_enum" as enum ('DIRECT_SOW', 'TRANSPLANT');
        end if;
      end
    $$;`);

    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'ON_SOWED'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'ON_SOWED';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'AFTER_SOWING_DAYS'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'AFTER_SOWING_DAYS';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'ON_TRANSPLANTED'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'ON_TRANSPLANTED';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'AFTER_TRANSPLANT_DAYS'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'AFTER_TRANSPLANT_DAYS';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'BEFORE_TRANSPLANT_DAYS'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'BEFORE_TRANSPLANT_DAYS';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'ON_HARVEST_WINDOW_START'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'ON_HARVEST_WINDOW_START';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'BEFORE_HARVEST_WINDOW_START_DAYS'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'BEFORE_HARVEST_WINDOW_START_DAYS';
        end if;
      end
    $$;`);
    this.addSql(`do $$
      begin
        if not exists (
          select 1 from pg_enum
          where enumlabel = 'AFTER_HARVEST_DAYS'
            and enumtypid = (select oid from pg_type where typname = 'vegetable_action_rules_trigger_enum')
        ) then
          alter type "vegetable_action_rules_trigger_enum" add value 'AFTER_HARVEST_DAYS';
        end if;
      end
    $$;`);

    this.addSql(
      `update "vegetable_action_rules" set "trigger" = 'ON_SOWED' where "trigger" = 'ON_PLANTING_CREATED';`,
    );

    this.addSql(`do $$
      begin
        if not exists (select 1 from pg_type where typname = 'vegetable_action_rules_schedule_enum') then
          create type "vegetable_action_rules_schedule_enum" as enum ('ONCE', 'EVERY_N_DAYS');
        end if;
      end
    $$;`);

    this.addSql(
      `alter table "vegetable_action_rules" add column if not exists "schedule" "vegetable_action_rules_schedule_enum" not null default 'ONCE';`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" add column if not exists "every_n_days" int null;`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" add column if not exists "occurrences_limit" int null;`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" add column if not exists "apply_if_start_method" "plantings_start_method_enum"[] null;`,
    );

    this.addSql(
      `drop index if exists "vegetable_action_rules_vegetable_id_action_template_id_trigger_offset_days_unique";`,
    );
    this.addSql(
      `create unique index if not exists "vegetable_action_rules_vegetable_id_action_template_id_trigger_offset_days_schedule_every_n_days_unique" on "vegetable_action_rules" ("vegetable_id", "action_template_id", "trigger", "offset_days", "schedule", "every_n_days");`,
    );

    this.addSql(
      `alter table "vegetables" add column if not exists "rules_version" int not null default 1;`,
    );

    this.addSql(
      `alter table "plantings" add column if not exists "start_method" "plantings_start_method_enum" not null default 'DIRECT_SOW';`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "sowed_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "transplanted_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "harvest_window_start" timestamptz null;`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "harvest_window_end" timestamptz null;`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "timeline_timezone" varchar(64) not null default 'Europe/Warsaw';`,
    );
    this.addSql(
      `alter table "plantings" add column if not exists "applied_rules_version" int not null default 1;`,
    );

    this.addSql(
      `create index if not exists "plantings_sowed_at_index" on "plantings" ("sowed_at");`,
    );
    this.addSql(
      `create index if not exists "plantings_transplanted_at_index" on "plantings" ("transplanted_at");`,
    );
    this.addSql(
      `create index if not exists "plantings_harvest_window_start_index" on "plantings" ("harvest_window_start");`,
    );
    this.addSql(
      `create index if not exists "plantings_harvest_window_end_index" on "plantings" ("harvest_window_end");`,
    );

    this.addSql(
      `alter table "action_tasks" add column if not exists "cycle_index" int not null default 0;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "original_due_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "is_manually_rescheduled" boolean not null default false;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "generated_at" timestamptz null;`,
    );

    this.addSql(
      `drop index if exists "action_tasks_user_id_source_source_ref_id_due_at_unique";`,
    );
    this.addSql(
      `create unique index if not exists "action_tasks_user_id_source_source_ref_id_due_at_cycle_index_unique" on "action_tasks" ("user_id", "source", "source_ref_id", "due_at", "cycle_index");`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "bed_id" uuid null;`,
    );
    this.addSql(
      `update "harvest_prompt_states" hps set "bed_id" = p."bed_id" from "plantings" p where hps."planting_id" = p."id" and hps."bed_id" is null;`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" alter column "bed_id" set not null;`,
    );
    this.addSql(
      `do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'harvest_prompt_states_bed_id_foreign'
        ) then
          alter table "harvest_prompt_states" add constraint "harvest_prompt_states_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade on delete cascade;
        end if;
      end
    $$;`,
    );
    this.addSql(
      `create index if not exists "harvest_prompt_states_bed_id_index" on "harvest_prompt_states" ("bed_id");`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "last_shown_on" date null;`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "snooze_until" date null;`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "last_prompted_on";`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "confirmed_harvest_at";`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "last_answer";`,
    );
    this.addSql(
      `drop type if exists "harvest_prompt_states_last_answer_enum";`,
    );
  }

  down(): void {
    this.addSql(
      `do $$
      begin
        if exists (select 1 from pg_type where typname = 'harvest_prompt_states_last_answer_enum') then
          -- keep existing type
        else
          create type "harvest_prompt_states_last_answer_enum" as enum ('yes', 'no');
        end if;
      end
    $$;`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "last_prompted_on" varchar(10) null;`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "confirmed_harvest_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" add column if not exists "last_answer" "harvest_prompt_states_last_answer_enum" null;`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "last_shown_on";`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "snooze_until";`,
    );

    this.addSql(`drop index if exists "harvest_prompt_states_bed_id_index";`);
    this.addSql(
      `alter table "harvest_prompt_states" drop constraint if exists "harvest_prompt_states_bed_id_foreign";`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" drop column if exists "bed_id";`,
    );

    this.addSql(
      `drop index if exists "action_tasks_user_id_source_source_ref_id_due_at_cycle_index_unique";`,
    );
    this.addSql(
      `create unique index if not exists "action_tasks_user_id_source_source_ref_id_due_at_unique" on "action_tasks" ("user_id", "source", "source_ref_id", "due_at");`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "cycle_index";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "original_due_at";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "is_manually_rescheduled";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "generated_at";`,
    );

    this.addSql(`drop index if exists "plantings_harvest_window_end_index";`);
    this.addSql(`drop index if exists "plantings_harvest_window_start_index";`);
    this.addSql(`drop index if exists "plantings_transplanted_at_index";`);
    this.addSql(`drop index if exists "plantings_sowed_at_index";`);
    this.addSql(
      `alter table "plantings" drop column if exists "applied_rules_version";`,
    );
    this.addSql(
      `alter table "plantings" drop column if exists "timeline_timezone";`,
    );
    this.addSql(
      `alter table "plantings" drop column if exists "harvest_window_end";`,
    );
    this.addSql(
      `alter table "plantings" drop column if exists "harvest_window_start";`,
    );
    this.addSql(
      `alter table "plantings" drop column if exists "transplanted_at";`,
    );
    this.addSql(`alter table "plantings" drop column if exists "sowed_at";`);
    this.addSql(
      `alter table "plantings" drop column if exists "start_method";`,
    );

    this.addSql(
      `alter table "vegetables" drop column if exists "rules_version";`,
    );

    this.addSql(
      `drop index if exists "vegetable_action_rules_vegetable_id_action_template_id_trigger_offset_days_schedule_every_n_days_unique";`,
    );
    this.addSql(
      `create unique index if not exists "vegetable_action_rules_vegetable_id_action_template_id_trigger_offset_days_unique" on "vegetable_action_rules" ("vegetable_id", "action_template_id", "trigger", "offset_days");`,
    );

    this.addSql(
      `alter table "vegetable_action_rules" drop column if exists "apply_if_start_method";`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" drop column if exists "occurrences_limit";`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" drop column if exists "every_n_days";`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" drop column if exists "schedule";`,
    );

    this.addSql(`drop type if exists "vegetable_action_rules_schedule_enum";`);
    this.addSql(`drop type if exists "plantings_start_method_enum";`);
  }
}
