import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { LocationRecordMode } from '../common/enums/location.enums';

@Entity({ tableName: 'locations' })
export class Location {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Enum({ items: () => LocationRecordMode })
  mode!: LocationRecordMode;

  @Property({ length: 255 })
  label!: string;

  @Property({ type: 'double' })
  lat!: number;

  @Property({ type: 'double' })
  lon!: number;

  @Property({ type: 'double', nullable: true })
  accuracyM?: number | null;

  @Property({ length: 120, nullable: true })
  providerPlaceId?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  updatedAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
