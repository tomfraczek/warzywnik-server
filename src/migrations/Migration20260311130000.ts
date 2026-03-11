import { Migration } from '@mikro-orm/migrations';

export class Migration20260311130000 extends Migration {
  up(): void {
    this.addSql(
      `alter type "action_templates_target_enum" add value if not exists 'space';`,
    );

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_type where typname = 'action_templates_environment_enum'
        ) then
          create type "action_templates_environment_enum" as enum ('any', 'outdoor', 'tunnel', 'greenhouse');
        end if;
      end
      $$;
    `);

    this.addSql(
      `alter table "action_templates" add column if not exists "environment" "action_templates_environment_enum" not null default 'any';`,
    );

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_type where typname = 'growing_spaces_type_enum'
        ) then
          create type "growing_spaces_type_enum" as enum ('outdoor', 'tunnel', 'greenhouse');
        end if;
      end
      $$;
    `);

    this.addSql(`
      create table if not exists "growing_spaces" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "name" varchar(120) not null,
        "type" "growing_spaces_type_enum" not null default 'outdoor',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "growing_spaces_pkey" primary key ("id")
      );
    `);

    this.addSql(
      `alter table "growing_spaces" add constraint "growing_spaces_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index if not exists "growing_spaces_user_id_index" on "growing_spaces" ("user_id");`,
    );
    this.addSql(
      `create index if not exists "growing_spaces_type_index" on "growing_spaces" ("type");`,
    );
    this.addSql(
      `create unique index if not exists "growing_spaces_user_id_name_unique" on "growing_spaces" ("user_id", "name");`,
    );

    this.addSql(
      `alter table "beds" add column if not exists "growing_space_id" uuid null;`,
    );

    this.addSql(`
      insert into "growing_spaces" ("user_id", "name", "type")
      select distinct b."user_id", 'Domyślna przestrzeń', 'outdoor'::"growing_spaces_type_enum"
      from "beds" b
      where b."growing_space_id" is null
        and not exists (
          select 1
          from "growing_spaces" gs
          where gs."user_id" = b."user_id"
            and gs."name" = 'Domyślna przestrzeń'
        );
    `);

    this.addSql(`
      update "beds" b
      set "growing_space_id" = gs."id"
      from "growing_spaces" gs
      where b."growing_space_id" is null
        and gs."user_id" = b."user_id"
        and gs."name" = 'Domyślna przestrzeń';
    `);

    this.addSql(
      `alter table "beds" alter column "growing_space_id" set not null;`,
    );
    this.addSql(
      `alter table "beds" add constraint "beds_growing_space_id_foreign" foreign key ("growing_space_id") references "growing_spaces" ("id") on update cascade;`,
    );
    this.addSql(
      `create index if not exists "beds_growing_space_id_index" on "beds" ("growing_space_id");`,
    );

    this.addSql(
      `alter type "action_tasks_target_type_enum" add value if not exists 'space';`,
    );

    this.addSql(
      `alter table "action_tasks" add column if not exists "growing_space_id" uuid null;`,
    );
    this.addSql(
      `alter table "action_tasks" add constraint "action_tasks_growing_space_id_foreign" foreign key ("growing_space_id") references "growing_spaces" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `create index if not exists "action_tasks_growing_space_id_index" on "action_tasks" ("growing_space_id");`,
    );
  }

  down(): void {
    this.addSql(`drop index if exists "action_tasks_growing_space_id_index";`);
    this.addSql(
      `alter table "action_tasks" drop constraint if exists "action_tasks_growing_space_id_foreign";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "growing_space_id";`,
    );

    this.addSql(`drop index if exists "beds_growing_space_id_index";`);
    this.addSql(
      `alter table "beds" drop constraint if exists "beds_growing_space_id_foreign";`,
    );
    this.addSql(`alter table "beds" drop column if exists "growing_space_id";`);

    this.addSql(`drop table if exists "growing_spaces" cascade;`);
    this.addSql(`drop type if exists "growing_spaces_type_enum";`);

    this.addSql(
      `alter table "action_templates" drop column if exists "environment";`,
    );
    this.addSql(`drop type if exists "action_templates_environment_enum";`);

    this.addSql(`
      update "action_templates"
      set "target" = 'bed'
      where "target"::text = 'space';
    `);

    this.addSql(
      `alter table "action_templates" alter column "target" type text using "target"::text;`,
    );
    this.addSql(
      `create type "action_templates_target_enum_old" as enum ('bed', 'planting');`,
    );
    this.addSql(
      `alter table "action_templates" alter column "target" type "action_templates_target_enum_old" using "target"::"action_templates_target_enum_old";`,
    );
    this.addSql(`drop type if exists "action_templates_target_enum";`);
    this.addSql(
      `alter type "action_templates_target_enum_old" rename to "action_templates_target_enum";`,
    );

    this.addSql(`
      update "action_tasks"
      set "target_type" = 'bed'
      where "target_type"::text = 'space';
    `);

    this.addSql(
      `alter table "action_tasks" alter column "target_type" type text using "target_type"::text;`,
    );
    this.addSql(
      `create type "action_tasks_target_type_enum_old" as enum ('user', 'bed', 'planting');`,
    );
    this.addSql(
      `alter table "action_tasks" alter column "target_type" type "action_tasks_target_type_enum_old" using "target_type"::"action_tasks_target_type_enum_old";`,
    );
    this.addSql(`drop type if exists "action_tasks_target_type_enum";`);
    this.addSql(
      `alter type "action_tasks_target_type_enum_old" rename to "action_tasks_target_type_enum";`,
    );
  }
}
