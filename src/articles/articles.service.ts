import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Article } from './article.entity';
import { toSlug } from '../common/utils/slug.util';
import { EntitlementsService } from '../entitlements/entitlements.service';
import {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.schemas';
import {
  ArticleContext,
  ArticleSeason,
  ArticleStatus,
} from '../common/enums/article.enums';
import { AnalyticsService } from '../analytics/analytics.service';
import { User } from '../users/user.entity';
import { calculateReadTimeMinutes } from '../common/utils/read-time.util';
import { NotificationEventService } from '../notifications/notification-event.service';
import { Planting } from '../plantings/planting.entity';
import { ACTIVE_PLANTING_STATUSES } from '../plantings/planting-lifecycle';
import { PlantingDisease } from '../planting-diseases/planting-disease.entity';
import { PestOccurrence } from '../pest-occurrences/pest-occurrence.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';
import { PlantingStatus } from '../common/enums/planting.enums';

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
    private readonly notificationEventService: NotificationEventService,
    private readonly entitlementsService: EntitlementsService,
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

    const isPremium = user ? this.entitlementsService.isPremium(user) : false;
    return this.serializeDetail(entity, isPremium);
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

    if (article.status === ArticleStatus.PUBLISHED) {
      await this.publishArticleRecommendations(article);
    }

    return this.serializeDetail(article);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.em.findOne(Article, { id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const wasPublished = article.status === ArticleStatus.PUBLISHED;

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

    const nowPublished = article.status === ArticleStatus.PUBLISHED;
    const becamePublished = !wasPublished && nowPublished;
    const publishedAtSet = dto.publishedAt !== undefined && nowPublished;
    if (becamePublished || publishedAtSet) {
      await this.publishArticleRecommendations(article);
    }

    return this.serializeDetail(article);
  }

  private async publishArticleRecommendations(article: Article): Promise<void> {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const season = this.resolveSeason(currentMonth);

    if (article.months.length > 0 && !article.months.includes(currentMonth)) {
      return;
    }

    if (article.seasons.length > 0 && !article.seasons.includes(season)) {
      return;
    }

    const plantings = await this.em.find(
      Planting,
      {
        status: { $in: ACTIVE_PLANTING_STATUSES },
      },
      {
        populate: ['user', 'vegetable', 'bed', 'bed.soil'],
      },
    );

    if (plantings.length === 0) {
      return;
    }

    const plantingIds = plantings.map((item) => item.id);
    const [diseases, pests, fertilizerTasks] = await Promise.all([
      this.em.find(
        PlantingDisease,
        {
          planting: { $in: plantingIds },
        },
        { populate: ['disease', 'planting'] },
      ),
      this.em.find(
        PestOccurrence,
        {
          planting: { $in: plantingIds },
        },
        { populate: ['pest', 'planting'] },
      ),
      this.em.find(ActionTask, {
        user: { $in: [...new Set(plantings.map((item) => item.user.id))] },
        status: { $in: [ActionTaskStatus.PENDING, ActionTaskStatus.DONE] },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const diseaseSlugByPlantingId = new Map<string, Set<string>>();
    for (const disease of diseases) {
      const set = diseaseSlugByPlantingId.get(disease.planting.id) ?? new Set();
      set.add(disease.disease.slug);
      diseaseSlugByPlantingId.set(disease.planting.id, set);
    }

    const pestSlugByPlantingId = new Map<string, Set<string>>();
    for (const pest of pests) {
      const set = pestSlugByPlantingId.get(pest.planting.id) ?? new Set();
      set.add(pest.pest.slug);
      pestSlugByPlantingId.set(pest.planting.id, set);
    }

    const matchedUserIds = new Set<string>();
    const fertilizerTaskTitlesByUserId = new Map<string, string[]>();

    for (const task of fertilizerTasks) {
      const current = fertilizerTaskTitlesByUserId.get(task.user.id) ?? [];
      current.push(task.title.toLowerCase());
      fertilizerTaskTitlesByUserId.set(task.user.id, current);
    }

    for (const planting of plantings) {
      const matchVegetable =
        article.relatedVegetableSlugs.length === 0 ||
        article.relatedVegetableSlugs.includes(planting.vegetable.slug);

      const matchSoil =
        article.relatedSoilSlugs.length === 0 ||
        (planting.bed.soil != null &&
          article.relatedSoilSlugs.includes(planting.bed.soil.slug));

      const diseaseSet = diseaseSlugByPlantingId.get(planting.id) ?? new Set();
      const matchDisease =
        article.relatedDiseaseSlugs.length === 0 ||
        article.relatedDiseaseSlugs.some((slug) => diseaseSet.has(slug));

      const pestSet = pestSlugByPlantingId.get(planting.id) ?? new Set();
      const matchPest =
        article.relatedPestSlugs.length === 0 ||
        article.relatedPestSlugs.some((slug) => pestSet.has(slug));

      const userTaskTitles =
        fertilizerTaskTitlesByUserId.get(planting.user.id) ?? [];
      const matchFertilizer =
        article.relatedFertilizerSlugs.length === 0 ||
        article.relatedFertilizerSlugs.some((slug) =>
          userTaskTitles.some((title) => title.includes(slug.toLowerCase())),
        );

      const contexts = this.deriveContextsForPlanting(planting);
      const matchContext =
        article.contexts.length === 0 ||
        article.contexts.some((ctx) => contexts.has(ctx));

      if (
        matchVegetable &&
        matchSoil &&
        matchDisease &&
        matchPest &&
        matchFertilizer &&
        matchContext
      ) {
        matchedUserIds.add(planting.user.id);
      }
    }

    if (matchedUserIds.size === 0) {
      return;
    }

    await this.notificationEventService.publishArticleEvent({
      userIds: Array.from(matchedUserIds),
      articleId: article.id,
      articleSlug: article.slug,
      articleTitle: article.title,
    });
  }

  private resolveSeason(month: number): ArticleSeason {
    if ([12, 1, 2].includes(month)) {
      return ArticleSeason.WINTER;
    }

    if ([3, 4, 5].includes(month)) {
      return ArticleSeason.SPRING;
    }

    if ([6, 7, 8].includes(month)) {
      return ArticleSeason.SUMMER;
    }

    return ArticleSeason.AUTUMN;
  }

  private deriveContextsForPlanting(planting: Planting): Set<ArticleContext> {
    const contexts = new Set<ArticleContext>([ArticleContext.LEARNING]);

    if (planting.status === PlantingStatus.NEW) {
      contexts.add(ArticleContext.PLANNING);
      contexts.add(ArticleContext.SOWING);
    }

    if (planting.harvestWindowStart || planting.harvestWindowEnd) {
      contexts.add(ArticleContext.HARVEST);
    }

    contexts.add(ArticleContext.PROBLEM_SOLVING);

    return contexts;
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

  private serializeDetail(article: Article, isPremium = true) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: isPremium ? article.content : null,
      fullArticlesLocked: !isPremium,
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
