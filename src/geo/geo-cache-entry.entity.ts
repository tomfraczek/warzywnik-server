import { Entity, Index, PrimaryKey, Property, TextType } from '@mikro-orm/core';

@Entity({ tableName: 'geo_cache_entries' })
@Index({ properties: ['expiresAt'] })
export class GeoCacheEntry {
  @PrimaryKey({ type: 'varchar', length: 255 })
  cacheKey!: string;

  @Property({ type: TextType })
  payload!: string;

  @Property({ type: Date })
  expiresAt!: Date;

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
