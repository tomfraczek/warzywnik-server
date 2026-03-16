import { Migration } from '@mikro-orm/migrations';

export class Migration20260316114000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_type where typname = 'vegetables_botanical_family_enum'
        ) then
          create type "vegetables_botanical_family_enum" as enum (
            'SOLANACEAE',
            'CUCURBITACEAE',
            'BRASSICACEAE',
            'AMARYLLIDACEAE',
            'APIACEAE',
            'FABACEAE',
            'AMARANTHACEAE',
            'ASTERACEAE',
            'ASPARAGACEAE',
            'POLYGONACEAE',
            'MALVACEAE',
            'POACEAE'
          );
        end if;
      end
      $$;
    `);

    this.addSql(
      `alter table "vegetables" add column if not exists "botanical_family" "vegetables_botanical_family_enum" null;`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "vegetables" drop column if exists "botanical_family";`,
    );
    this.addSql(`drop type if exists "vegetables_botanical_family_enum";`);
  }
}
