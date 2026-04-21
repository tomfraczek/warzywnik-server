import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'article_metrics' })
export class ArticleMetric {
  @PrimaryKey({ length: 180 })
  articleSlug!: string;

  @Property({ type: 'int', default: 0 })
  viewsTotal: number = 0;

  @Property({ type: 'int', default: 0 })
  engagedSecondsTotal: number = 0;

  @Property({ type: 'int', default: 0 })
  scroll50Count: number = 0;

  @Property({ type: 'int', default: 0 })
  scroll90Count: number = 0;

  @Property({ type: 'int', default: 0 })
  favoriteCount: number = 0;

  @Property({ type: Date, defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}
