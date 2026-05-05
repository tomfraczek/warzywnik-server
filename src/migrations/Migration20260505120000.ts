import { Migration } from '@mikro-orm/migrations';

export class Migration20260505120000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_templates_aggregation_scope_enum') then
          create type "action_templates_aggregation_scope_enum" as enum (
            'none',
            'bed',
            'space',
            'user'
          );
        end if;
      end$$;
    `);

    this.addSql(
      `alter table "action_templates" add column if not exists "aggregation_scope" "action_templates_aggregation_scope_enum" not null default 'none';`,
    );
    this.addSql(
      `update "action_templates" set "aggregation_scope" = 'none' where "aggregation_scope" is null;`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "action_templates" drop column if exists "aggregation_scope";`,
    );
  }
}
