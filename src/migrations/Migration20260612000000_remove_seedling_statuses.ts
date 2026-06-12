import { Migration } from '@mikro-orm/migrations';

export class Migration20260612000000_remove_seedling_statuses extends Migration {
  async up(): Promise<void> {
    // 1. Migrate any plantings still in removed seedling statuses to IN_GROUND
    await this.execute(`
      UPDATE plantings
      SET status = 'IN_GROUND'
      WHERE status IN ('SEEDLING_PREPARED', 'SEEDLING_READY_FOR_TRANSPLANT')
    `);

    // 2. Clear allowed_planting_statuses restrictions that only referenced removed statuses
    await this.execute(`
      UPDATE action_templates
      SET allowed_planting_statuses = NULL
      WHERE allowed_planting_statuses <@ ARRAY['SEEDLING_PREPARED', 'SEEDLING_READY_FOR_TRANSPLANT']
        AND allowed_planting_statuses IS NOT NULL
    `);

    // 3. Remove removed statuses from any mixed allowed_planting_statuses arrays,
    //    then set to NULL if the result is empty
    await this.execute(`
      UPDATE action_templates
      SET allowed_planting_statuses = array_remove(
        array_remove(allowed_planting_statuses, 'SEEDLING_PREPARED'),
        'SEEDLING_READY_FOR_TRANSPLANT'
      )
      WHERE allowed_planting_statuses IS NOT NULL
        AND (
          'SEEDLING_PREPARED' = ANY(allowed_planting_statuses)
          OR 'SEEDLING_READY_FOR_TRANSPLANT' = ANY(allowed_planting_statuses)
        )
    `);

    await this.execute(`
      UPDATE action_templates
      SET allowed_planting_statuses = NULL
      WHERE allowed_planting_statuses = '{}'
    `);
  }

  async down(): Promise<void> {
    // Data migration is irreversible — removed statuses cannot be restored automatically
  }
}
