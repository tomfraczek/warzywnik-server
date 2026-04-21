import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Favorite } from './favorite.entity';
import { User } from '../users/user.entity';
import {
  AddFavoriteDto,
  ListFavoritesQueryDto,
  ListGroupedFavoritesQueryDto,
} from './dto/favorite.schemas';
import { FavoriteTargetType } from '../common/enums/favorite.enums';
import { AnalyticsService } from '../analytics/analytics.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { Soil } from '../soils/soil.entity';
import { Article } from '../articles/article.entity';

type FavoriteSerializedItem = {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string | null;
  targetSlug: string;
  name: string | null;
  imageUrl: string | null;
  createdAt: string;
};

type FavoriteTargetDetails = {
  targetId: string;
  name: string | null;
  imageUrl: string | null;
};

@Injectable()
export class FavoritesService {
  constructor(
    private readonly em: EntityManager,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async add(user: User, dto: AddFavoriteDto) {
    const existing = await this.em.findOne(Favorite, {
      user: user.id,
      targetType: dto.targetType,
      targetSlug: dto.targetSlug,
    });

    if (existing) {
      const [item] = await this.enrichFavorites([existing], true);
      return {
        created: false,
        item,
      };
    }

    const favorite = new Favorite();
    favorite.user = user;
    favorite.targetType = dto.targetType;
    favorite.targetSlug = dto.targetSlug;

    await this.em.persistAndFlush(favorite);
    await this.analyticsService.applyFavoriteDelta(
      dto.targetType,
      dto.targetSlug,
      1,
    );

    const [item] = await this.enrichFavorites([favorite], true);

    return {
      created: true,
      item,
    };
  }

  async remove(user: User, targetType: FavoriteTargetType, targetSlug: string) {
    const favorite = await this.em.findOne(Favorite, {
      user: user.id,
      targetType,
      targetSlug,
    });

    if (!favorite) {
      return;
    }

    await this.em.removeAndFlush(favorite);
    await this.analyticsService.applyFavoriteDelta(targetType, targetSlug, -1);
  }

  async list(user: User, query: ListFavoritesQueryDto) {
    const { page, limit, targetType, include } = query;

    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (targetType) {
      where.targetType = targetType;
    }

    const [items, total] = await this.em.findAndCount(Favorite, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
    });

    const serializedItems = await this.enrichFavorites(items, include === 'details');

    return {
      items: serializedItems,
      page,
      limit,
      total,
    };
  }

  async listGrouped(user: User, query: ListGroupedFavoritesQueryDto) {
    const items = await this.em.find(
      Favorite,
      { user: user.id },
      { orderBy: { createdAt: 'desc' } },
    );

    const enrichedItems = await this.enrichFavorites(
      items,
      query.include === 'details',
    );

    const grouped: Record<
      FavoriteTargetType,
      FavoriteSerializedItem[]
    > = {
      [FavoriteTargetType.ARTICLE]: [],
      [FavoriteTargetType.VEGETABLE]: [],
      [FavoriteTargetType.SOIL]: [],
      [FavoriteTargetType.DISEASE]: [],
      [FavoriteTargetType.PEST]: [],
      [FavoriteTargetType.FERTILIZER]: [],
    };

    for (const item of enrichedItems) {
      grouped[item.targetType].push(item);
    }

    return grouped;
  }

  private async enrichFavorites(
    items: Favorite[],
    includeDetails: boolean,
  ): Promise<FavoriteSerializedItem[]> {
    if (!items.length) {
      return [];
    }

    const detailsByType = await this.loadDetailsByType(items);

    return items.map((entity) => {
      const targetDetails = detailsByType[entity.targetType].get(entity.targetSlug);

      return {
        id: entity.id,
        targetType: entity.targetType,
        targetId: targetDetails?.targetId ?? null,
        targetSlug: entity.targetSlug,
        name: includeDetails ? (targetDetails?.name ?? null) : null,
        imageUrl: includeDetails ? (targetDetails?.imageUrl ?? null) : null,
        createdAt: entity.createdAt.toISOString(),
      };
    });
  }

  private async loadDetailsByType(items: Favorite[]) {
    const slugsByType: Record<FavoriteTargetType, string[]> = {
      [FavoriteTargetType.ARTICLE]: [],
      [FavoriteTargetType.VEGETABLE]: [],
      [FavoriteTargetType.SOIL]: [],
      [FavoriteTargetType.DISEASE]: [],
      [FavoriteTargetType.PEST]: [],
      [FavoriteTargetType.FERTILIZER]: [],
    };

    for (const item of items) {
      slugsByType[item.targetType].push(item.targetSlug);
    }

    const uniqueSlugsByType: Record<FavoriteTargetType, string[]> = {
      [FavoriteTargetType.ARTICLE]: [...new Set(slugsByType[FavoriteTargetType.ARTICLE])],
      [FavoriteTargetType.VEGETABLE]: [
        ...new Set(slugsByType[FavoriteTargetType.VEGETABLE]),
      ],
      [FavoriteTargetType.SOIL]: [...new Set(slugsByType[FavoriteTargetType.SOIL])],
      [FavoriteTargetType.DISEASE]: [...new Set(slugsByType[FavoriteTargetType.DISEASE])],
      [FavoriteTargetType.PEST]: [...new Set(slugsByType[FavoriteTargetType.PEST])],
      [FavoriteTargetType.FERTILIZER]: [
        ...new Set(slugsByType[FavoriteTargetType.FERTILIZER]),
      ],
    };

    const [articles, vegetables, soils, diseases, pests, fertilizers] =
      await Promise.all([
        uniqueSlugsByType[FavoriteTargetType.ARTICLE].length
          ? this.em.find(
              Article,
              { slug: { $in: uniqueSlugsByType[FavoriteTargetType.ARTICLE] } },
              { fields: ['id', 'slug', 'title', 'coverImageUrl'] },
            )
          : Promise.resolve([]),
        uniqueSlugsByType[FavoriteTargetType.VEGETABLE].length
          ? this.em.find(
              Vegetable,
              { slug: { $in: uniqueSlugsByType[FavoriteTargetType.VEGETABLE] } },
              { fields: ['id', 'slug', 'name', 'imageUrl'] },
            )
          : Promise.resolve([]),
        uniqueSlugsByType[FavoriteTargetType.SOIL].length
          ? this.em.find(
              Soil,
              { slug: { $in: uniqueSlugsByType[FavoriteTargetType.SOIL] } },
              { fields: ['id', 'slug', 'name'] },
            )
          : Promise.resolve([]),
        uniqueSlugsByType[FavoriteTargetType.DISEASE].length
          ? this.em.find(
              Disease,
              { slug: { $in: uniqueSlugsByType[FavoriteTargetType.DISEASE] } },
              { fields: ['id', 'slug', 'name'] },
            )
          : Promise.resolve([]),
        uniqueSlugsByType[FavoriteTargetType.PEST].length
          ? this.em.find(
              Pest,
              { slug: { $in: uniqueSlugsByType[FavoriteTargetType.PEST] } },
              { fields: ['id', 'slug', 'name'] },
            )
          : Promise.resolve([]),
        uniqueSlugsByType[FavoriteTargetType.FERTILIZER].length
          ? this.em.find(
              FertilizerType,
              {
                slug: {
                  $in: uniqueSlugsByType[FavoriteTargetType.FERTILIZER],
                },
              },
              { fields: ['id', 'slug', 'name'] },
            )
          : Promise.resolve([]),
      ]);

    const result: Record<FavoriteTargetType, Map<string, FavoriteTargetDetails>> = {
      [FavoriteTargetType.ARTICLE]: new Map(
        articles.map((item) => [
          item.slug,
          {
            targetId: item.id,
            name: item.title,
            imageUrl: item.coverImageUrl ?? null,
          },
        ]),
      ),
      [FavoriteTargetType.VEGETABLE]: new Map(
        vegetables.map((item) => [
          item.slug,
          {
            targetId: item.id,
            name: item.name,
            imageUrl: item.imageUrl ?? null,
          },
        ]),
      ),
      [FavoriteTargetType.SOIL]: new Map(
        soils.map((item) => [
          item.slug,
          { targetId: item.id, name: item.name, imageUrl: null },
        ]),
      ),
      [FavoriteTargetType.DISEASE]: new Map(
        diseases.map((item) => [
          item.slug,
          { targetId: item.id, name: item.name, imageUrl: null },
        ]),
      ),
      [FavoriteTargetType.PEST]: new Map(
        pests.map((item) => [
          item.slug,
          { targetId: item.id, name: item.name, imageUrl: null },
        ]),
      ),
      [FavoriteTargetType.FERTILIZER]: new Map(
        fertilizers.map((item) => [
          item.slug,
          { targetId: item.id, name: item.name, imageUrl: null },
        ]),
      ),
    };

    return result;
  }
}
