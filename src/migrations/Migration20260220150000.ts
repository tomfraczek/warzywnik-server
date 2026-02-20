import { Migration } from '@mikro-orm/migrations';

export class Migration20260220150000 extends Migration {
  up(): void {
    this.addSql(
      `create type "vegetable_action_rules_trigger_enum" as enum ('ON_PLANTING_CREATED', 'ON_HARVEST_CONFIRMED');`,
    );

    this.addSql(
      `create table "vegetable_action_rules" (
        "id" uuid not null default gen_random_uuid(),
        "vegetable_id" uuid not null,
        "action_template_id" uuid not null,
        "trigger" "vegetable_action_rules_trigger_enum" not null,
        "offset_days" int not null default 0,
        "is_enabled" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "vegetable_action_rules_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create index "vegetable_action_rules_vegetable_id_index" on "vegetable_action_rules" ("vegetable_id");`,
    );
    this.addSql(
      `create index "vegetable_action_rules_action_template_id_index" on "vegetable_action_rules" ("action_template_id");`,
    );
    this.addSql(
      `create unique index "vegetable_action_rules_vegetable_id_action_template_id_trigger_offset_days_unique" on "vegetable_action_rules" ("vegetable_id", "action_template_id", "trigger", "offset_days");`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" add constraint "vegetable_action_rules_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "vegetable_action_rules" add constraint "vegetable_action_rules_action_template_id_foreign" foreign key ("action_template_id") references "action_templates" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create type "action_tasks_source_enum" as enum ('MANUAL', 'VEGETABLE_RULE');`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "source" "action_tasks_source_enum" not null default 'MANUAL';`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "source_ref_id" uuid null;`,
    );
    this.addSql(
      `create index if not exists "action_tasks_user_id_index" on "action_tasks" ("user_id");`,
    );
    this.addSql(
      `create index if not exists "action_tasks_status_index" on "action_tasks" ("status");`,
    );
    this.addSql(
      `create index if not exists "action_tasks_source_ref_id_index" on "action_tasks" ("source_ref_id");`,
    );

    this.addSql(
      `alter table "action_tasks" alter column "status" type text using "status"::text;`,
    );
    this.addSql(
      `update "action_tasks" set "status" = 'pending' where "status" = 'planned';`,
    );
    this.addSql(
      `update "action_tasks" set "status" = 'canceled' where "status" = 'skipped';`,
    );
    this.addSql(
      `create type "action_tasks_status_enum_new" as enum ('pending', 'done', 'canceled');`,
    );
    this.addSql(
      `alter table "action_tasks" alter column "status" type "action_tasks_status_enum_new" using "status"::"action_tasks_status_enum_new";`,
    );
    this.addSql(`drop type "action_tasks_status_enum";`);
    this.addSql(
      `alter type "action_tasks_status_enum_new" rename to "action_tasks_status_enum";`,
    );

    this.addSql(
      `create unique index if not exists "action_tasks_user_id_source_source_ref_id_due_at_unique" on "action_tasks" ("user_id", "source", "source_ref_id", "due_at");`,
    );

    this.addSql(
      `alter table "reminders" add column if not exists "action_task_id" uuid null;`,
    );
    this.addSql(
      `create index if not exists "reminders_action_task_id_index" on "reminders" ("action_task_id");`,
    );

    this.addSql(
      `do $$
      begin
        if not exists (
          select 1
          from pg_enum
          where enumlabel = 'ACTION_TASK_DUE'
            and enumtypid = (select oid from pg_type where typname = 'reminders_type_enum')
        ) then
          alter type "reminders_type_enum" add value 'ACTION_TASK_DUE';
        end if;
      end$$;`,
    );
  }

  down(): void {
    this.addSql(`drop index if exists "reminders_action_task_id_index";`);
    this.addSql(
      `alter table "reminders" drop column if exists "action_task_id";`,
    );

    this.addSql(
      `do $$
      begin
        if exists (select 1 from pg_type where typname = 'reminders_type_enum') then
          create type "reminders_type_enum_old" as enum ('DISEASE_CHECK', 'DISEASE_TREATMENT', 'PEST_CHECK');
          alter table "reminders" alter column "type" type "reminders_type_enum_old" using "type"::text::"reminders_type_enum_old";
          drop type "reminders_type_enum";
          alter type "reminders_type_enum_old" rename to "reminders_type_enum";
        end if;
      end$$;`,
    );

    this.addSql(
      `drop index if exists "action_tasks_user_id_source_source_ref_id_due_at_unique";`,
    );
    this.addSql(`drop index if exists "action_tasks_source_ref_id_index";`);
    this.addSql(`drop index if exists "action_tasks_status_index";`);
    this.addSql(`drop index if exists "action_tasks_user_id_index";`);

    this.addSql(
      `alter table "action_tasks" alter column "status" type text using "status"::text;`,
    );
    this.addSql(
      `update "action_tasks" set "status" = 'planned' where "status" = 'pending';`,
    );
    this.addSql(
      `update "action_tasks" set "status" = 'skipped' where "status" = 'canceled';`,
    );
    this.addSql(
      `create type "action_tasks_status_enum_old" as enum ('planned', 'done', 'skipped');`,
    );
    this.addSql(
      `alter table "action_tasks" alter column "status" type "action_tasks_status_enum_old" using "status"::"action_tasks_status_enum_old";`,
    );
    this.addSql(`drop type "action_tasks_status_enum";`);
    this.addSql(
      `alter type "action_tasks_status_enum_old" rename to "action_tasks_status_enum";`,
    );

    this.addSql(
      `alter table "action_tasks" drop column if exists "source_ref_id";`,
    );
    this.addSql(`alter table "action_tasks" drop column if exists "source";`);
    this.addSql(`drop type if exists "action_tasks_source_enum";`);

    this.addSql(`drop table if exists "vegetable_action_rules" cascade;`);
    this.addSql(`drop type if exists "vegetable_action_rules_trigger_enum";`);
  }
}
