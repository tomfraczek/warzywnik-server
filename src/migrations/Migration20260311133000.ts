import { Migration } from '@mikro-orm/migrations';

export class Migration20260311133000 extends Migration {
  up(): void {
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'climate_control';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'ventilation';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'humidity_reduction';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'shading';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'structure_inspection';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'structure_repair';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'space_hygiene';`,
    );
    this.addSql(
      `alter type "action_templates_type_enum" add value if not exists 'seasonal_preparation';`,
    );
  }

  down(): void {
    this.addSql(`
      update "action_templates"
      set "type" = 'manual_custom'
      where "type"::text in (
        'climate_control',
        'ventilation',
        'humidity_reduction',
        'shading',
        'structure_inspection',
        'structure_repair',
        'space_hygiene',
        'seasonal_preparation'
      );
    `);

    this.addSql(
      `alter table "action_templates" alter column "type" type text using "type"::text;`,
    );

    this.addSql(
      `create type "action_templates_type_enum_old" as enum ('sowing', 'transplanting', 'thinning', 'hardening', 'watering', 'fertilization', 'pruning', 'weeding', 'staking', 'harvest', 'pest_control', 'disease_control', 'spraying', 'physical_protection', 'trap_setup', 'soil_preparation', 'soil_amendment', 'mulching', 'soil_testing', 'soil_regeneration', 'irrigation_setup', 'monitoring', 'rotation_planning', 'bed_ready', 'manual_custom');`,
    );

    this.addSql(
      `alter table "action_templates" alter column "type" type "action_templates_type_enum_old" using "type"::"action_templates_type_enum_old";`,
    );

    this.addSql(`drop type if exists "action_templates_type_enum";`);
    this.addSql(
      `alter type "action_templates_type_enum_old" rename to "action_templates_type_enum";`,
    );
  }
}
