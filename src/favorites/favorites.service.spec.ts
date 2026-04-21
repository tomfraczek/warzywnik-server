import { FavoritesService } from './favorites.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { AnalyticsService } from '../analytics/analytics.service';
import { Favorite } from './favorite.entity';
import { FavoriteTargetType } from '../common/enums/favorite.enums';
import { Article } from '../articles/article.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Soil } from '../soils/soil.entity';
import { Disease } from '../diseases/disease.entity';
import { Pest } from '../pests/pest.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { User } from '../users/user.entity';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('FavoritesService targetId contract', () => {
  let service: FavoritesService;
  let em: {
    find: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    persistAndFlush: jest.Mock;
    removeAndFlush: jest.Mock;
  };

  const analyticsServiceMock = {
    applyFavoriteDelta: jest.fn(),
  } as unknown as AnalyticsService;

  const user = { id: 'user-1' } as User;

  const favoriteFixtures: Favorite[] = [
    {
      id: 'fav-article',
      targetType: FavoriteTargetType.ARTICLE,
      targetSlug: 'artykul-o-pomidorach',
      createdAt: new Date('2026-04-21T10:00:00.000Z'),
    } as Favorite,
    {
      id: 'fav-veg',
      targetType: FavoriteTargetType.VEGETABLE,
      targetSlug: 'pomidor',
      createdAt: new Date('2026-04-21T10:01:00.000Z'),
    } as Favorite,
    {
      id: 'fav-soil',
      targetType: FavoriteTargetType.SOIL,
      targetSlug: 'gliniasta',
      createdAt: new Date('2026-04-21T10:02:00.000Z'),
    } as Favorite,
    {
      id: 'fav-disease',
      targetType: FavoriteTargetType.DISEASE,
      targetSlug: 'zaraza-ziemniaka',
      createdAt: new Date('2026-04-21T10:03:00.000Z'),
    } as Favorite,
    {
      id: 'fav-pest',
      targetType: FavoriteTargetType.PEST,
      targetSlug: 'stonka-ziemniaczana',
      createdAt: new Date('2026-04-21T10:04:00.000Z'),
    } as Favorite,
    {
      id: 'fav-fertilizer',
      targetType: FavoriteTargetType.FERTILIZER,
      targetSlug: 'kompost',
      createdAt: new Date('2026-04-21T10:05:00.000Z'),
    } as Favorite,
  ];

  beforeEach(() => {
    em = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
    };

    em.find.mockImplementation((entity: unknown) => {
      if (entity === Favorite) {
        return Promise.resolve(favoriteFixtures);
      }

      if (entity === Article) {
        return Promise.resolve([
          {
            id: '11111111-1111-4111-8111-111111111111',
            slug: 'artykul-o-pomidorach',
            title: 'Artykuł o pomidorach',
            coverImageUrl: 'https://cdn.example.com/articles/pomidor.jpg',
          },
        ]);
      }

      if (entity === Vegetable) {
        return Promise.resolve([
          {
            id: '22222222-2222-4222-8222-222222222222',
            slug: 'pomidor',
            name: 'Pomidor',
            imageUrl: 'https://cdn.example.com/vegetables/pomidor.jpg',
          },
        ]);
      }

      if (entity === Soil) {
        return Promise.resolve([
          {
            id: '33333333-3333-4333-8333-333333333333',
            slug: 'gliniasta',
            name: 'Gleba gliniasta',
          },
        ]);
      }

      if (entity === Disease) {
        return Promise.resolve([
          {
            id: '44444444-4444-4444-8444-444444444444',
            slug: 'zaraza-ziemniaka',
            name: 'Zaraza ziemniaka',
          },
        ]);
      }

      if (entity === Pest) {
        return Promise.resolve([
          {
            id: '55555555-5555-4555-8555-555555555555',
            slug: 'stonka-ziemniaczana',
            name: 'Stonka ziemniaczana',
          },
        ]);
      }

      if (entity === FertilizerType) {
        return Promise.resolve([
          {
            id: '66666666-6666-4666-8666-666666666666',
            slug: 'kompost',
            name: 'Kompost',
          },
        ]);
      }

      return Promise.resolve([]);
    });

    service = new FavoritesService(
      em as unknown as EntityManager,
      analyticsServiceMock,
    );
  });

  it('returns targetId for every targetType in grouped favorites', async () => {
    const grouped = await service.listGrouped(user, { include: 'details' });

    const allItems = Object.values(grouped).flat();
    expect(allItems).toHaveLength(6);

    for (const item of allItems) {
      expect(item.targetId).toMatch(UUID_REGEX);
    }

    expect(grouped.ARTICLE[0].name).toBe('Artykuł o pomidorach');
    expect(grouped.ARTICLE[0].imageUrl).toBe(
      'https://cdn.example.com/articles/pomidor.jpg',
    );

    expect(grouped.VEGETABLE[0].name).toBe('Pomidor');
    expect(grouped.VEGETABLE[0].imageUrl).toBe(
      'https://cdn.example.com/vegetables/pomidor.jpg',
    );

    expect(grouped.SOIL[0].name).toBe('Gleba gliniasta');
    expect(grouped.SOIL[0].imageUrl).toBeNull();
  });

  it('still returns targetId when include is not provided', async () => {
    const grouped = await service.listGrouped(user, {});

    const allItems = Object.values(grouped).flat();
    expect(allItems).toHaveLength(6);

    for (const item of allItems) {
      expect(item.targetId).toMatch(UUID_REGEX);
      expect(item.name).toBeNull();
      expect(item.imageUrl).toBeNull();
    }
  });
});
