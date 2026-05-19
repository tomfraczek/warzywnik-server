import { Migration } from '@mikro-orm/migrations';

export class Migration20260519120000 extends Migration {
  override up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'plan_checklist_scope_enum') then
          create type "plan_checklist_scope_enum" as enum ('bed', 'planting');
        end if;
        if not exists (select 1 from pg_type where typname = 'plan_checklist_status_enum') then
          create type "plan_checklist_status_enum" as enum ('pending', 'done', 'skipped');
        end if;
        if not exists (select 1 from pg_type where typname = 'plan_checklist_source_enum') then
          create type "plan_checklist_source_enum" as enum ('auto', 'manual');
        end if;
        if not exists (select 1 from pg_type where typname = 'plan_checklist_priority_enum') then
          create type "plan_checklist_priority_enum" as enum ('low', 'medium', 'high', 'critical');
        end if;
      end$$;
    `);

    this.addSql(`
      create table if not exists "plan_checklist_templates" (
        "id" uuid not null default gen_random_uuid(),
        "slug" varchar(180) not null,
        "title_template" varchar(255) not null,
        "description_template" text null,
        "reason_template" text null,
        "scope" "plan_checklist_scope_enum" not null default 'bed',
        "priority" "plan_checklist_priority_enum" not null default 'medium',
        "conditions" jsonb null,
        "is_active" boolean not null default true,
        "version" int not null default 1,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "plan_checklist_templates_pkey" primary key ("id"),
        constraint "plan_checklist_templates_slug_unique" unique ("slug")
      );
      create index if not exists "plan_checklist_templates_is_active_idx" on "plan_checklist_templates" ("is_active");
    `);

    this.addSql(`
      create table if not exists "plan_checklist_items" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "bed_id" uuid not null,
        "planting_id" uuid null,
        "vegetable_id" uuid null,
        "soil_id" uuid null,
        "fertilizer_id" uuid null,
        "template_id" uuid null,
        "scope" "plan_checklist_scope_enum" not null,
        "status" "plan_checklist_status_enum" not null default 'pending',
        "source" "plan_checklist_source_enum" not null,
        "source_key" text null,
        "dedupe_key" text null,
        "priority" "plan_checklist_priority_enum" not null default 'medium',
        "title" varchar(255) not null,
        "description" text null,
        "reason" text null,
        "metadata" jsonb null,
        "is_user_modified" boolean not null default false,
        "suppressed_at" timestamptz null,
        "archived_at" timestamptz null,
        "archive_reason" text null,
        "done_at" timestamptz null,
        "skipped_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "plan_checklist_items_pkey" primary key ("id")
      );

      create index if not exists "plan_checklist_items_user_bed_idx" on "plan_checklist_items" ("user_id", "bed_id");
      create index if not exists "plan_checklist_items_planting_idx" on "plan_checklist_items" ("planting_id");
      create index if not exists "plan_checklist_items_status_idx" on "plan_checklist_items" ("status");
      create index if not exists "plan_checklist_items_source_idx" on "plan_checklist_items" ("source");
      create index if not exists "plan_checklist_items_source_key_idx" on "plan_checklist_items" ("source_key");
      create index if not exists "plan_checklist_items_dedupe_key_idx" on "plan_checklist_items" ("dedupe_key");
      create index if not exists "plan_checklist_items_suppressed_at_idx" on "plan_checklist_items" ("suppressed_at");
      create index if not exists "plan_checklist_items_archived_at_idx" on "plan_checklist_items" ("archived_at");
      create unique index if not exists "plan_checklist_items_user_source_dedupe_unique" on "plan_checklist_items" ("user_id", "source", "dedupe_key");

      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_user_fk"
        foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_bed_fk"
        foreign key ("bed_id") references "beds" ("id") on update cascade on delete cascade;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_planting_fk"
        foreign key ("planting_id") references "plantings" ("id") on update cascade on delete set null;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_vegetable_fk"
        foreign key ("vegetable_id") references "vegetables" ("id") on update cascade on delete set null;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_soil_fk"
        foreign key ("soil_id") references "soils" ("id") on update cascade on delete set null;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_fertilizer_fk"
        foreign key ("fertilizer_id") references "fertilizer_types" ("id") on update cascade on delete set null;
      alter table "plan_checklist_items"
        add constraint "plan_checklist_items_template_fk"
        foreign key ("template_id") references "plan_checklist_templates" ("id") on update cascade on delete set null;
    `);
  }

  override down(): void {
    this.addSql('drop table if exists "plan_checklist_items" cascade;');
    this.addSql('drop table if exists "plan_checklist_templates" cascade;');

    this.addSql('drop type if exists "plan_checklist_priority_enum";');
    this.addSql('drop type if exists "plan_checklist_source_enum";');
    this.addSql('drop type if exists "plan_checklist_status_enum";');
    this.addSql('drop type if exists "plan_checklist_scope_enum";');
  }
}
