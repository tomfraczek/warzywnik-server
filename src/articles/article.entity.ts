import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import {
  ArticleContext,
  ArticleSeason,
  ArticleStatus,
} from '../common/enums/article.enums';

@Entity({ tableName: 'articles' })
@Index({ properties: ['status'] })
@Index({ properties: ['publishedAt'] })
export class Article {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 120 })
  @Unique()
  slug!: string;

  @Property({ length: 200 })
  title!: string;

  @Property({ type: TextType })
  excerpt!: string;

  @Property({ type: TextType })
  content!: string;

  @Property({ type: 'int', default: 1 })
  readTimeMinutes: number = 1;

  @Property({ length: 255, nullable: true })
  coverImageUrl?: string | null;

  @Property({ type: Date, nullable: true })
  coverUpdatedAt?: Date | null;

  @Property({ type: 'int[]' })
  months: number[] = [];

  @Enum({ items: () => ArticleSeason, array: true })
  seasons: ArticleSeason[] = [];

  @Enum({ items: () => ArticleContext, array: true })
  contexts: ArticleContext[] = [];

  @Property({ type: 'int', default: 3 })
  priority: number = 3;

  @Property({ type: 'text[]' })
  relatedVegetableSlugs: string[] = [];

  @Property({ type: 'text[]' })
  relatedSoilSlugs: string[] = [];

  @Property({ type: 'text[]' })
  relatedFertilizerSlugs: string[] = [];

  @Property({ type: 'text[]' })
  relatedDiseaseSlugs: string[] = [];

  @Property({ type: 'text[]' })
  relatedPestSlugs: string[] = [];

  @Enum({ items: () => ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus = ArticleStatus.DRAFT;

  @Property({ type: Date, nullable: true })
  publishedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
