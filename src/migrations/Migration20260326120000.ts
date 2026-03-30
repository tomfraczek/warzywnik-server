import { Migration } from '@mikro-orm/migrations';

export class Migration20260326120000 extends Migration {
  up(): void {
    const slugTables = [
      { table: 'soils', slugLength: 160, fallbackPrefix: 'soil' },
      { table: 'pests', slugLength: 160, fallbackPrefix: 'pest' },
      { table: 'diseases', slugLength: 160, fallbackPrefix: 'disease' },
      {
        table: 'fertilizer_types',
        slugLength: 160,
        fallbackPrefix: 'fertilizer',
      },
      {
        table: 'action_templates',
        slugLength: 180,
        fallbackPrefix: 'action-template',
      },
      { table: 'vegetables', slugLength: 180, fallbackPrefix: 'vegetable' },
    ] as const;

    this.addSql(`
      create or replace function __seed_slugify(input text)
      returns text
      language sql
      immutable
      as $$
        select trim(both '-' from regexp_replace(
          regexp_replace(
            lower(
              translate(coalesce(input, ''), 'ąćęłńóśżźĄĆĘŁŃÓŚŻŹ', 'acelnoszzacelnoszz')
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ));
      $$;
    `);

    for (const cfg of slugTables) {
      this.addSql(
        `alter table "${cfg.table}" add column if not exists "slug" varchar(${cfg.slugLength});`,
      );

      this.addSql(
        `update "${cfg.table}" set "slug" = nullif(__seed_slugify("name"), '') where "slug" is null;`,
      );

      this.addSql(`
        with d as (
          select
            id,
            slug,
            row_number() over (partition by slug order by "created_at", id) as rn
          from "${cfg.table}"
          where slug is not null
        )
        update "${cfg.table}" x
        set "slug" = d.slug || '-' || substr(x.id::text, 1, 8)
        from d
        where x.id = d.id and d.rn > 1;
      `);

      this.addSql(
        `update "${cfg.table}" set "slug" = '${cfg.fallbackPrefix}-' || substr(id::text, 1, 8) where "slug" is null;`,
      );

      this.addSql(
        `alter table "${cfg.table}" alter column "slug" set not null;`,
      );

      this.addSql(
        `create unique index if not exists "${cfg.table}_slug_unique" on "${cfg.table}" ("slug");`,
      );
    }
  }

  down(): void {
    const tables = [
      'soils',
      'pests',
      'diseases',
      'fertilizer_types',
      'action_templates',
      'vegetables',
    ] as const;

    for (const table of tables) {
      this.addSql(`drop index if exists "${table}_slug_unique";`);
      this.addSql(`alter table "${table}" drop column if exists "slug";`);
    }

    this.addSql(`drop function if exists __seed_slugify(text);`);
  }
}
