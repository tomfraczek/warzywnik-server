import { Migration } from '@mikro-orm/migrations';

export class Migration20260220100000 extends Migration {
  up(): void {
    this.addSql(
      `create type "action_templates_target_enum" as enum ('bed', 'planting');`,
    );
    this.addSql(
      `create type "action_templates_type_enum" as enum ('WATER', 'SPRAY', 'FERTILIZE', 'WEED', 'HARVEST', 'SOIL_PREP', 'OTHER');`,
    );
    this.addSql(
      `create type "action_tasks_target_type_enum" as enum ('bed', 'planting');`,
    );
    this.addSql(
      `create type "action_tasks_status_enum" as enum ('planned', 'done', 'skipped');`,
    );

    this.addSql(
      `create table "action_templates" (
        "id" uuid not null default gen_random_uuid(),
        "slug" varchar(80) not null,
        "name" varchar(120) not null,
        "description" text null,
        "target" "action_templates_target_enum" not null,
        "type" "action_templates_type_enum" not null,
        "default_due_offset_days" int not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "action_templates_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create unique index "action_templates_slug_unique" on "action_templates" ("slug");`,
    );

    this.addSql(
      `create table "action_tasks" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "target_type" "action_tasks_target_type_enum" not null,
        "planting_id" uuid null,
        "bed_id" uuid null,
        "status" "action_tasks_status_enum" not null,
        "due_at" timestamptz null,
        "title" varchar(180) not null,
        "description" text null,
        "action_template_id" uuid null,
        "done_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "action_tasks_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create index "action_tasks_user_id_due_at_index" on "action_tasks" ("user_id", "due_at");`,
    );
    this.addSql(
      `create index "action_tasks_planting_id_index" on "action_tasks" ("planting_id");`,
    );
    this.addSql(
      `create index "action_tasks_bed_id_index" on "action_tasks" ("bed_id");`,
    );
    this.addSql(
      `alter table "action_tasks" add constraint "action_tasks_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "action_tasks" add constraint "action_tasks_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "action_tasks" add constraint "action_tasks_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "action_tasks" add constraint "action_tasks_action_template_id_foreign" foreign key ("action_template_id") references "action_templates" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `create table "pest_recommended_actions" (
        "pest_id" uuid not null,
        "action_template_id" uuid not null,
        constraint "pest_recommended_actions_pkey" primary key ("pest_id", "action_template_id")
      );`,
    );
    this.addSql(
      `create index "pest_recommended_actions_pest_id_index" on "pest_recommended_actions" ("pest_id");`,
    );
    this.addSql(
      `create index "pest_recommended_actions_action_template_id_index" on "pest_recommended_actions" ("action_template_id");`,
    );
    this.addSql(
      `alter table "pest_recommended_actions" add constraint "pest_recommended_actions_pest_id_foreign" foreign key ("pest_id") references "pests" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "pest_recommended_actions" add constraint "pest_recommended_actions_action_template_id_foreign" foreign key ("action_template_id") references "action_templates" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create table "disease_recommended_actions" (
        "disease_id" uuid not null,
        "action_template_id" uuid not null,
        constraint "disease_recommended_actions_pkey" primary key ("disease_id", "action_template_id")
      );`,
    );
    this.addSql(
      `create index "disease_recommended_actions_disease_id_index" on "disease_recommended_actions" ("disease_id");`,
    );
    this.addSql(
      `create index "disease_recommended_actions_action_template_id_index" on "disease_recommended_actions" ("action_template_id");`,
    );
    this.addSql(
      `alter table "disease_recommended_actions" add constraint "disease_recommended_actions_disease_id_foreign" foreign key ("disease_id") references "diseases" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "disease_recommended_actions" add constraint "disease_recommended_actions_action_template_id_foreign" foreign key ("action_template_id") references "action_templates" ("id") on update cascade on delete cascade;`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "disease_recommended_actions" cascade;`);
    this.addSql(`drop table if exists "pest_recommended_actions" cascade;`);
    this.addSql(`drop table if exists "action_tasks" cascade;`);
    this.addSql(`drop table if exists "action_templates" cascade;`);

    this.addSql(`drop type if exists "action_tasks_status_enum";`);
    this.addSql(`drop type if exists "action_tasks_target_type_enum";`);
    this.addSql(`drop type if exists "action_templates_type_enum";`);
    this.addSql(`drop type if exists "action_templates_target_enum";`);
  }
}
