import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Article } from './article.entity';
import {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.schemas';
import { ArticleStatus } from '../common/enums/article.enums';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

type ArticleListItem = Pick<
  Article,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'coverImageUrl'
  | 'months'
  | 'seasons'
  | 'contexts'
  | 'priority'
  | 'publishedAt'
>;

@Injectable()
export class ArticlesService {
  constructor(private readonly em: EntityManager) {}

  async listPublic(query: ListArticlesQueryDto) {
    const {
      page,
      limit,
      q,
      status,
      month,
      season,
      context,
      vegetableId,
      soilId,
      fertilizerId,
      diseaseId,
      pestId,
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

    if (vegetableId) {
      where.relatedVegetableIds = { $contains: [vegetableId] };
    }

    if (soilId) {
      where.relatedSoilIds = { $contains: [soilId] };
    }

    if (fertilizerId) {
      where.relatedFertilizerIds = { $contains: [fertilizerId] };
    }

    if (diseaseId) {
      where.relatedDiseaseIds = { $contains: [diseaseId] };
    }

    if (pestId) {
      where.relatedPestIds = { $contains: [pestId] };
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

  async getPublicByIdOrSlug(idOrSlug: string) {
    const where: Record<string, unknown> = isUuid(idOrSlug)
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    const entity = await this.em.findOne(Article, where);

    if (!entity) {
      throw new NotFoundException('Article not found');
    }

    return this.serializeDetail(entity);
  }

  async create(dto: CreateArticleDto) {
    const existing = await this.em.findOne(Article, { slug: dto.slug });
    if (existing) {
      throw new ConflictException('Article slug already exists');
    }

    const article = new Article();
    article.slug = dto.slug;
    article.title = dto.title;
    article.excerpt = dto.excerpt;
    article.content = dto.content;
    article.coverImageUrl = dto.coverImageUrl ?? null;
    article.months = dto.months ?? [];
    article.seasons = dto.seasons ?? [];
    article.contexts = dto.contexts ?? [];
    article.priority = dto.priority ?? 3;
    article.relatedVegetableIds = dto.relatedVegetableIds ?? [];
    article.relatedSoilIds = dto.relatedSoilIds ?? [];
    article.relatedFertilizerIds = dto.relatedFertilizerIds ?? [];
    article.relatedDiseaseIds = dto.relatedDiseaseIds ?? [];
    article.relatedPestIds = dto.relatedPestIds ?? [];
    article.status = dto.status ?? ArticleStatus.DRAFT;
    article.publishedAt = dto.publishedAt ?? null;

    if (article.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

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
    if (dto.relatedVegetableIds !== undefined)
      article.relatedVegetableIds = dto.relatedVegetableIds;
    if (dto.relatedSoilIds !== undefined)
      article.relatedSoilIds = dto.relatedSoilIds;
    if (dto.relatedFertilizerIds !== undefined)
      article.relatedFertilizerIds = dto.relatedFertilizerIds;
    if (dto.relatedDiseaseIds !== undefined)
      article.relatedDiseaseIds = dto.relatedDiseaseIds;
    if (dto.relatedPestIds !== undefined)
      article.relatedPestIds = dto.relatedPestIds;
    if (dto.status !== undefined) article.status = dto.status;
    if (dto.publishedAt !== undefined) article.publishedAt = dto.publishedAt;

    if (article.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

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

  private serializeListItem(article: ArticleListItem) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      coverImageUrl: article.coverImageUrl ?? null,
      months: article.months ?? [],
      seasons: article.seasons ?? [],
      contexts: article.contexts ?? [],
      priority: article.priority,
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
      months: article.months ?? [],
      seasons: article.seasons ?? [],
      contexts: article.contexts ?? [],
      priority: article.priority,
      publishedAt: article.publishedAt ?? null,
      relatedVegetableIds: article.relatedVegetableIds ?? [],
      relatedSoilIds: article.relatedSoilIds ?? [],
      relatedFertilizerIds: article.relatedFertilizerIds ?? [],
      relatedDiseaseIds: article.relatedDiseaseIds ?? [],
      relatedPestIds: article.relatedPestIds ?? [],
    };
  }
}
