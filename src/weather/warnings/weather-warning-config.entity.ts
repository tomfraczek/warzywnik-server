import { Entity, Enum, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { WarningCode } from '../../common/enums/warning.enums';

@Entity({ tableName: 'weather_warning_config' })
export class WeatherWarningConfig {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Enum({ items: () => WarningCode })
  @Unique()
  code!: WarningCode;

  @Property({ type: 'json', columnType: 'jsonb' })
  params: Record<string, unknown> = {};

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: 'int', default: 1 })
  version: number = 1;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
