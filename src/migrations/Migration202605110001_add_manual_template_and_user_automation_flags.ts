import { Migration } from '@mikro-orm/migrations';

export class Migration202605110001_add_manual_template_and_user_automation_flags extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table "action_templates" add column "is_user_selectable" boolean not null default false;',
    );
    this.addSql(
      'alter table "users" add column "automatic_tasks_enabled" boolean not null default true;',
    );

    this.addSql(
      'update "action_templates" set "is_user_selectable" = true where "generation_mode"::text = \'MANUAL_ONLY\';',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table "users" drop column "automatic_tasks_enabled";');
    this.addSql(
      'alter table "action_templates" drop column "is_user_selectable";',
    );
  }
}
