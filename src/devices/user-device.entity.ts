import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { DevicePlatform } from '../common/enums/device.enums';

@Entity({ tableName: 'user_devices' })
@Index({ properties: ['user'] })
export class UserDevice {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => DevicePlatform })
  platform!: DevicePlatform;

  @Property({ length: 255 })
  @Unique()
  expoPushToken!: string;

  @Property({ type: 'boolean', default: true })
  isEnabled: boolean = true;

  @Property({ type: Date, nullable: true })
  lastSuccessAt?: Date | null;

  @Property({ type: Date, nullable: true })
  lastErrorAt?: Date | null;

  @Property({ length: 64, nullable: true })
  lastErrorCode?: string | null;

  @Property({ length: 120, nullable: true })
  disabledReason?: string | null;

  @Property({ type: Date, nullable: true })
  lastReceiptCheckedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
