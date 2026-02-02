import { Migration } from '@mikro-orm/migrations';

export class Migration20260202090000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "vegetables" add column "family" varchar(32) not null default 'OTHER';`,
    );
    this.addSql(
      `alter table "vegetables" add column "nutrient_needs" varchar(16) not null default 'MEDIUM';`,
    );
    this.addSql(
      `alter table "vegetables" add column "rotation_group" varchar(32) not null default 'OTHER';`,
    );
    this.addSql(
      `create index "idx_vegetables_family" on "vegetables" ("family");`,
    );
    this.addSql(
      `create index "idx_vegetables_nutrient_needs" on "vegetables" ("nutrient_needs");`,
    );
    this.addSql(
      `create index "idx_vegetables_rotation_group" on "vegetables" ("rotation_group");`,
    );
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists "idx_vegetables_family";');
    this.addSql('drop index if exists "idx_vegetables_nutrient_needs";');
    this.addSql('drop index if exists "idx_vegetables_rotation_group";');
    this.addSql('alter table "vegetables" drop column "family";');
    this.addSql('alter table "vegetables" drop column "nutrient_needs";');
    this.addSql('alter table "vegetables" drop column "rotation_group";');
  }
}
