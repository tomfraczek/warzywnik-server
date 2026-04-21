import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Article } from './article.entity';
import { toSlug } from '../common/utils/slug.util';
import {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.schemas';
import { ArticleStatus } from '../common/enums/article.enums';
import { AnalyticsService } from '../analytics/analytics.service';
import { User } from '../users/user.entity';
import { calculateReadTimeMinutes } from '../common/utils/read-time.util';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

type ArticleListItem = Pick<
  Article,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'coverImageUrl'
  | 'coverUpdatedAt'
  | 'months'
  | 'seasons'
  | 'contexts'
  | 'priority'
  | 'readTimeMinutes'
  | 'publishedAt'
>;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly em: EntityManager,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async listPublic(query: ListArticlesQueryDto) {
    const {
      page,
      limit,
      q,
      status,
      month,
      season,
      context,
      vegetableSlug,
      soilSlug,
      fertilizerSlug,
      diseaseSlug,
      pestSlug,
    } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { title: { $ilike: `%${q}%` } },
        { slug: { $ilike: `%${q}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (month) {
      where.months = { $contains: [month] };
    }

    if (season) {
      where.seasons = { $contains: [season] };
    }

    if (context) {
      where.contexts = { $contains: [context] };
    }

    if (vegetableSlug) {
      where.relatedVegetableSlugs = { $contains: [vegetableSlug] };
    }

    if (soilSlug) {
      where.relatedSoilSlugs = { $contains: [soilSlug] };
    }

    if (fertilizerSlug) {
      where.relatedFertilizerSlugs = { $contains: [fertilizerSlug] };
    }

    if (diseaseSlug) {
      where.relatedDiseaseSlugs = { $contains: [diseaseSlug] };
    }

    if (pestSlug) {
      where.relatedPestSlugs = { $contains: [pestSlug] };
    }

    const [items, total] = await this.em.findAndCount(Article, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { priority: 'desc', publishedAt: 'desc' },
      fields: [
        'id',
        'slug',
        'title',
        'excerpt',
        'coverImageUrl',
        'months',
        'seasons',
        'contexts',
        'priority',
        'readTimeMinutes',
        'publishedAt',
      ],
    });

    return {
      items: items.map((item) => this.serializeListItem(item)),
      page,
      limit,
      total,
    };
  }

  async getPublicByIdOrSlug(idOrSlug: string, user?: User | null) {
    const where: Record<string, unknown> = isUuid(idOrSlug)
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    const entity = await this.em.findOne(Article, where);

    if (!entity) {
      throw new NotFoundException('Article not found');
    }

    await this.analyticsService.recordArticleView({
      articleSlug: entity.slug,
      userId: user?.id ?? null,
    });

    return this.serializeDetail(entity);
  }

  async getPublicBySlug(slug: string, user?: User | null) {
    return this.getPublicByIdOrSlug(slug, user);
  }

  async getById(id: string) {
    const entity = await this.em.findOne(Article, { id });

    if (!entity) {
      throw new NotFoundException('Article not found');
    }

    return this.serializeDetail(entity);
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug ?? toSlug(dto.title);
    const existing = await this.em.findOne(Article, { slug });
    if (existing) {
      throw new ConflictException('Article slug already exists');
    }

    const article = new Article();
    article.slug = slug;
    article.title = dto.title;
    article.excerpt = dto.excerpt;
    article.content = dto.content;
    article.coverImageUrl = dto.coverImageUrl ?? null;
    article.months = dto.months ?? [];
    article.seasons = dto.seasons ?? [];
    article.contexts = dto.contexts ?? [];
    article.priority = dto.priority ?? 3;
    article.relatedVegetableSlugs = dto.relatedVegetableSlugs ?? [];
    article.relatedSoilSlugs = dto.relatedSoilSlugs ?? [];
    article.relatedFertilizerSlugs = dto.relatedFertilizerSlugs ?? [];
    article.relatedDiseaseSlugs = dto.relatedDiseaseSlugs ?? [];
    article.relatedPestSlugs = dto.relatedPestSlugs ?? [];
    article.status = dto.status ?? ArticleStatus.DRAFT;
    article.publishedAt = dto.publishedAt ?? null;

    if (article.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    article.readTimeMinutes = calculateReadTimeMinutes(article.content);

    await this.em.persistAndFlush(article);
    return this.serializeDetail(article);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.em.findOne(Article, { id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (dto.slug && dto.slug !== article.slug) {
      const existing = await this.em.findOne(Article, { slug: dto.slug });
      if (existing) {
        throw new ConflictException('Article slug already exists');
      }
      article.slug = dto.slug;
    }

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.excerpt !== undefined) article.excerpt = dto.excerpt;
    if (dto.content !== undefined) article.content = dto.content;
    if (dto.coverImageUrl !== undefined) {
      article.coverImageUrl = dto.coverImageUrl;
    }
    if (dto.months !== undefined) article.months = dto.months;
    if (dto.seasons !== undefined) article.seasons = dto.seasons;
    if (dto.contexts !== undefined) article.contexts = dto.contexts;
    if (dto.priority !== undefined) article.priority = dto.priority;
    if (dto.relatedVegetableSlugs !== undefined)
      article.relatedVegetableSlugs = dto.relatedVegetableSlugs;
    if (dto.relatedSoilSlugs !== undefined)
      article.relatedSoilSlugs = dto.relatedSoilSlugs;
    if (dto.relatedFertilizerSlugs !== undefined)
      article.relatedFertilizerSlugs = dto.relatedFertilizerSlugs;
    if (dto.relatedDiseaseSlugs !== undefined)
      article.relatedDiseaseSlugs = dto.relatedDiseaseSlugs;
    if (dto.relatedPestSlugs !== undefined)
      article.relatedPestSlugs = dto.relatedPestSlugs;
    if (dto.status !== undefined) article.status = dto.status;
    if (dto.publishedAt !== undefined) article.publishedAt = dto.publishedAt;

    if (article.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    article.readTimeMinutes = calculateReadTimeMinutes(article.content);

    await this.em.persistAndFlush(article);
    return this.serializeDetail(article);
  }

  async remove(id: string) {
    const article = await this.em.findOne(Article, { id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.em.removeAndFlush(article);
  }

  async removeMany(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const articles = await this.em.find(Article, { id: { $in: uniqueIds } });

    if (articles.length !== uniqueIds.length) {
      throw new NotFoundException('One or more articles not found');
    }

    await this.em.removeAndFlush(articles);
  }

  private serializeListItem(article: ArticleListItem) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      coverImageUrl: article.coverImageUrl ?? null,
      coverUpdatedAt: article.coverUpdatedAt?.toISOString() ?? null,
      months: article.months ?? [],
      seasons: article.seasons ?? [],
      contexts: article.contexts ?? [],
      priority: article.priority,
      readTimeMinutes: article.readTimeMinutes,
      publishedAt: article.publishedAt ?? null,
    };
  }

  private serializeDetail(article: Article) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      coverImageUrl: article.coverImageUrl ?? null,
      coverUpdatedAt: article.coverUpdatedAt?.toISOString() ?? null,
      months: article.months ?? [],
      seasons: article.seasons ?? [],
      contexts: article.contexts ?? [],
      priority: article.priority,
      readTimeMinutes: article.readTimeMinutes,
      publishedAt: article.publishedAt ?? null,
      relatedVegetableSlugs: article.relatedVegetableSlugs ?? [],
      relatedSoilSlugs: article.relatedSoilSlugs ?? [],
      relatedFertilizerSlugs: article.relatedFertilizerSlugs ?? [],
      relatedDiseaseSlugs: article.relatedDiseaseSlugs ?? [],
      relatedPestSlugs: article.relatedPestSlugs ?? [],
    };
  }
}
