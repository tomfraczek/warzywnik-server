import { Migration } from '@mikro-orm/migrations';

export class Migration20260224120000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "action_templates" drop constraint if exists "action_templates_slug_unique";`,
    );
    this.addSql(`drop index if exists "action_templates_slug_unique";`);
    this.addSql(`alter table "action_templates" drop column if exists "slug";`);

    this.addSql(
      `alter table "action_templates" alter column "default_due_offset_days" drop not null;`,
    );

    this.addSql(
      `alter table "action_templates" alter column "type" type text using "type"::text;`,
    );

    this.addSql(`
      update "action_templates"
      set "type" = case
        when lower("type") in ('watering', 'water') then 'watering'
        when lower("type") in ('fertilization', 'fertilize') then 'fertilization'
        when lower("type") in ('spray', 'spraying') then 'spraying'
        when lower("type") in ('monitoring') then 'monitoring'
        when lower("type") in ('manual', 'other', 'manual_custom') then 'manual_custom'
        when lower("type") in ('system', 'bed_ready', 'ready_to_use', 'ready') then 'bed_ready'
        when lower("type") in ('weeding', 'weed') then 'weeding'
        when lower("type") in ('harvest') then 'harvest'
        when lower("type") in ('sowing') then 'sowing'
        when lower("type") in ('transplanting') then 'transplanting'
        when lower("type") in ('thinning') then 'thinning'
        when lower("type") in ('hardening') then 'hardening'
        when lower("type") in ('pruning') then 'pruning'
        when lower("type") in ('staking') then 'staking'
        when lower("type") in ('pest_control') then 'pest_control'
        when lower("type") in ('disease_control') then 'disease_control'
        when lower("type") in ('physical_protection') then 'physical_protection'
        when lower("type") in ('trap_setup') then 'trap_setup'
        when lower("type") in ('soil_prep', 'soil_preparation') then 'soil_preparation'
        when lower("type") in ('soil_amendment') then 'soil_amendment'
        when lower("type") in ('mulching') then 'mulching'
        when lower("type") in ('soil_testing') then 'soil_testing'
        when lower("type") in ('soil_regeneration') then 'soil_regeneration'
        when lower("type") in ('irrigation_setup') then 'irrigation_setup'
        when lower("type") in ('rotation_planning') then 'rotation_planning'
        else 'manual_custom'
      end;
    `);

    this.addSql(
      `create type "action_templates_type_enum_new" as enum ('sowing', 'transplanting', 'thinning', 'hardening', 'watering', 'fertilization', 'pruning', 'weeding', 'staking', 'harvest', 'pest_control', 'disease_control', 'spraying', 'physical_protection', 'trap_setup', 'soil_preparation', 'soil_amendment', 'mulching', 'soil_testing', 'soil_regeneration', 'irrigation_setup', 'monitoring', 'rotation_planning', 'bed_ready', 'manual_custom');`,
    );

    this.addSql(
      `alter table "action_templates" alter column "type" type "action_templates_type_enum_new" using "type"::"action_templates_type_enum_new";`,
    );

    this.addSql(`drop type if exists "action_templates_type_enum";`);
    this.addSql(
      `alter type "action_templates_type_enum_new" rename to "action_templates_type_enum";`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "action_templates" alter column "type" type text using "type"::text;`,
    );

    this.addSql(`
      update "action_templates"
      set "type" = case
        when lower("type") = 'watering' then 'WATER'
        when lower("type") = 'fertilization' then 'FERTILIZE'
        when lower("type") in ('spraying', 'disease_control', 'pest_control') then 'SPRAY'
        when lower("type") = 'weeding' then 'WEED'
        when lower("type") = 'harvest' then 'HARVEST'
        when lower("type") in ('soil_preparation', 'soil_amendment', 'mulching', 'soil_testing', 'soil_regeneration', 'irrigation_setup', 'rotation_planning', 'bed_ready') then 'SOIL_PREP'
        else 'OTHER'
      end;
    `);

    this.addSql(
      `create type "action_templates_type_enum_old" as enum ('WATER', 'SPRAY', 'FERTILIZE', 'WEED', 'HARVEST', 'SOIL_PREP', 'OTHER');`,
    );

    this.addSql(
      `alter table "action_templates" alter column "type" type "action_templates_type_enum_old" using "type"::"action_templates_type_enum_old";`,
    );

    this.addSql(`drop type if exists "action_templates_type_enum";`);
    this.addSql(
      `alter type "action_templates_type_enum_old" rename to "action_templates_type_enum";`,
    );

    this.addSql(
      `update "action_templates" set "default_due_offset_days" = 0 where "default_due_offset_days" is null;`,
    );
    this.addSql(
      `alter table "action_templates" alter column "default_due_offset_days" set not null;`,
    );
  }
}
