import { Migration } from '@mikro-orm/migrations';

export class Migration20260223120000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "pests" drop constraint if exists "pests_slug_unique";`,
    );
    this.addSql(`drop index if exists "pests_slug_unique";`);
    this.addSql(`alter table "pests" drop column if exists "slug";`);

    this.addSql(
      `alter table "diseases" drop constraint if exists "diseases_slug_unique";`,
    );
    this.addSql(`drop index if exists "diseases_slug_unique";`);
    this.addSql(`alter table "diseases" drop column if exists "slug";`);

    this.addSql(
      `alter table "soils" drop constraint if exists "soils_slug_unique";`,
    );
    this.addSql(`drop index if exists "soils_slug_unique";`);
    this.addSql(`alter table "soils" drop column if exists "slug";`);

    this.addSql(
      `alter table "fertilizer_types" drop constraint if exists "fertilizer_types_slug_unique";`,
    );
    this.addSql(`drop index if exists "fertilizer_types_slug_unique";`);
    this.addSql(`alter table "fertilizer_types" drop column if exists "slug";`);

    this.addSql(
      `alter table "action_templates" drop constraint if exists "action_templates_slug_unique";`,
    );
    this.addSql(`drop index if exists "action_templates_slug_unique";`);
    this.addSql(`alter table "action_templates" drop column if exists "slug";`);

    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_slug_unique";`,
    );
    this.addSql(`drop index if exists "vegetables_slug_unique";`);
    this.addSql(`alter table "vegetables" drop column if exists "slug";`);

    this.addSql(
      `create unique index if not exists "pests_name_unique_ci" on "pests" (lower("name"));`,
    );
    this.addSql(
      `create unique index if not exists "diseases_name_unique_ci" on "diseases" (lower("name"));`,
    );
    this.addSql(
      `create unique index if not exists "soils_name_unique_ci" on "soils" (lower("name"));`,
    );
    this.addSql(
      `create unique index if not exists "fertilizer_types_name_unique_ci" on "fertilizer_types" (lower("name"));`,
    );
    this.addSql(
      `create unique index if not exists "action_templates_name_unique_ci" on "action_templates" (lower("name"));`,
    );
    this.addSql(
      `create unique index if not exists "vegetables_name_unique_ci" on "vegetables" (lower("name"));`,
    );
  }

  down(): void {
    this.addSql(`drop index if exists "vegetables_name_unique_ci";`);
    this.addSql(`drop index if exists "action_templates_name_unique_ci";`);
    this.addSql(`drop index if exists "fertilizer_types_name_unique_ci";`);
    this.addSql(`drop index if exists "soils_name_unique_ci";`);
    this.addSql(`drop index if exists "diseases_name_unique_ci";`);
    this.addSql(`drop index if exists "pests_name_unique_ci";`);

    this.addSql(
      `alter table "pests" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(`update "pests" set "slug" = id::text where "slug" is null;`);
    this.addSql(`alter table "pests" alter column "slug" set not null;`);
    this.addSql(
      `create unique index if not exists "pests_slug_unique" on "pests" ("slug");`,
    );

    this.addSql(
      `alter table "diseases" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(
      `update "diseases" set "slug" = id::text where "slug" is null;`,
    );
    this.addSql(`alter table "diseases" alter column "slug" set not null;`);
    this.addSql(
      `create unique index if not exists "diseases_slug_unique" on "diseases" ("slug");`,
    );

    this.addSql(
      `alter table "soils" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(`update "soils" set "slug" = id::text where "slug" is null;`);
    this.addSql(`alter table "soils" alter column "slug" set not null;`);
    this.addSql(
      `create unique index if not exists "soils_slug_unique" on "soils" ("slug");`,
    );

    this.addSql(
      `alter table "fertilizer_types" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(
      `update "fertilizer_types" set "slug" = id::text where "slug" is null;`,
    );
    this.addSql(
      `alter table "fertilizer_types" alter column "slug" set not null;`,
    );
    this.addSql(
      `alter table "fertilizer_types" add constraint "fertilizer_types_slug_unique" unique ("slug");`,
    );

    this.addSql(
      `alter table "action_templates" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(
      `update "action_templates" set "slug" = id::text where "slug" is null;`,
    );
    this.addSql(
      `alter table "action_templates" alter column "slug" set not null;`,
    );
    this.addSql(
      `create unique index if not exists "action_templates_slug_unique" on "action_templates" ("slug");`,
    );

    this.addSql(
      `alter table "vegetables" add column if not exists "slug" varchar(80);`,
    );
    this.addSql(
      `update "vegetables" set "slug" = id::text where "slug" is null;`,
    );
    this.addSql(`alter table "vegetables" alter column "slug" set not null;`);
    this.addSql(
      `create unique index if not exists "vegetables_slug_unique" on "vegetables" ("slug");`,
    );
  }
}
