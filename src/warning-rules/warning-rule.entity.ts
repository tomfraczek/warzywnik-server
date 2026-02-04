import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

@Entity({ tableName: 'warning_rules' })
@Index({ properties: ['enabled'] })
@Index({ properties: ['severity'] })
export class WarningRule {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Enum({ items: () => WarningCode })
  @Unique()
  code!: WarningCode;

  @Property({ type: 'boolean', default: true })
  enabled: boolean = true;

  @Enum({ items: () => WarningSeverity, default: WarningSeverity.WARNING })
  severity: WarningSeverity = WarningSeverity.WARNING;

  @Property({ length: 120 })
  title!: string;

  @Property({ type: TextType })
  messageTemplate!: string;

  @Property({ type: TextType, nullable: true })
  hintTemplate?: string | null;

  @Property({ type: 'boolean', default: false })
  blocking: boolean = false;

  @Property({ type: 'int', nullable: true })
  cooldownDays?: number | null;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
