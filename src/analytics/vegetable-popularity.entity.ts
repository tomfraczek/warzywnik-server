import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'vegetable_popularity' })
export class VegetablePopularity {
  @PrimaryKey({ length: 180 })
  vegetableSlug!: string;

  @Property({ type: 'int', default: 0 })
  addCountTotal: number = 0;

  @Property({ type: 'int', default: 0 })
  favoriteCount: number = 0;

  @Property({ type: Date, nullable: true })
  lastAddedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}
