import { Migration } from '@mikro-orm/migrations';

export class Migration20260124090000 extends Migration {
  up(): void {
    this.addSql(
      'alter table "vegetables" rename column "soil_ph_min" to "soil_phmin";',
    );
    this.addSql(
      'alter table "vegetables" rename column "soil_ph_max" to "soil_phmax";',
    );
  }

  down(): void {
    this.addSql(
      'alter table "vegetables" rename column "soil_phmin" to "soil_ph_min";',
    );
    this.addSql(
      'alter table "vegetables" rename column "soil_phmax" to "soil_ph_max";',
    );
  }
}
