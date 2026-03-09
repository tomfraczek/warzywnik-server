import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Planting } from '../plantings/planting.entity';
import { PlantingEventType } from '../common/enums/planting-event.enums';

@Entity({ tableName: 'planting_events' })
@Index({ properties: ['planting'] })
export class PlantingEvent {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting)
  planting!: Planting;

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'uuid' })
  bedId!: string;

  @Property({ type: 'uuid' })
  vegetableId!: string;

  @Enum({ items: () => PlantingEventType })
  eventType!: PlantingEventType;

  @Property({ type: Date })
  eventTime!: Date;

  @Property({ type: 'jsonb' })
  payload: Record<string, unknown> = {};

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
