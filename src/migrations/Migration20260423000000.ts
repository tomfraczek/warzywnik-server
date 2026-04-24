import { Migration } from '@mikro-orm/migrations';

export class Migration20260423000000 extends Migration {
  up(): Promise<void> {
    this.addSql(`
      update "plantings"
      set "status" = case
        when "status" = 'PLANNED' then 'NEW'
        when "status" = 'ACTIVE' then 'IN_GROUND'
        when "status" = 'HARVESTING' then 'READY_FOR_FINAL_HARVEST'
        when "status" = 'FINISHED' then 'HARVESTED'
        when "status" = 'CANCELLED' then 'CANCELLED'
        when "status" = 'NEW' then 'NEW'
        when "status" = 'SEEDLING_PREPARED' then 'SEEDLING_PREPARED'
        when "status" = 'SEEDLING_READY_FOR_TRANSPLANT' then 'SEEDLING_READY_FOR_TRANSPLANT'
        when "status" = 'IN_GROUND' then 'IN_GROUND'
        when "status" = 'READY_FOR_FINAL_HARVEST' then 'READY_FOR_FINAL_HARVEST'
        when "status" = 'HARVESTED' then 'HARVESTED'
        when "status" = 'CLEARED' then 'CLEARED'
        when "status" = 'FAILED' then 'FAILED'
        else 'NEW'
      end;
    `);

    this.addSql(
      `alter table "plantings" alter column "status" set default 'NEW';`,
    );

    return Promise.resolve();
  }

  down(): Promise<void> {
    this.addSql(`
      update "plantings"
      set "status" = case
        when "status" = 'NEW' then 'PLANNED'
        when "status" = 'SEEDLING_PREPARED' then 'ACTIVE'
        when "status" = 'SEEDLING_READY_FOR_TRANSPLANT' then 'ACTIVE'
        when "status" = 'IN_GROUND' then 'ACTIVE'
        when "status" = 'READY_FOR_FINAL_HARVEST' then 'HARVESTING'
        when "status" = 'HARVESTED' then 'FINISHED'
        when "status" = 'CLEARED' then 'CANCELLED'
        when "status" = 'FAILED' then 'CANCELLED'
        when "status" = 'CANCELLED' then 'CANCELLED'
        else 'PLANNED'
      end;
    `);

    this.addSql(
      `alter table "plantings" alter column "status" set default 'PLANNED';`,
    );

    return Promise.resolve();
  }
}
