import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { AnalyticsEventType } from '../common/enums/analytics.enums';
import { FavoriteTargetType } from '../common/enums/favorite.enums';
import {
  CmsDashboardQueryDto,
  PopularArticlesQueryDto,
  PopularVegetablesQueryDto,
  TrackEventDto,
} from './dto/analytics.schemas';

type PopularVegetableRow = {
  vegetableSlug: string;
  addCountWindow?: number | string;
  addCountTotal: number | string;
  favoriteCount: number | string;
  lastAddedAt?: Date | string | null;
  id?: string | null;
  name?: string | null;
  imageUrl?: string | null;
};

type PopularArticleRow = {
  articleSlug: string;
  viewsTotal: number | string;
  engagedSecondsTotal: number | string;
  scroll50Count: number | string;
  scroll90Count: number | string;
  favoriteCount: number | string;
  id?: string | null;
  title?: string | null;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | string | null;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly em: EntityManager) {}

  async trackEvents(user: User | null, events: TrackEventDto[]) {
    let accepted = 0;
    let duplicates = 0;

    for (const event of events) {
      const stored = await this.storeEvent(user, event);
      if (stored) {
        accepted += 1;
      } else {
        duplicates += 1;
      }
    }

    return {
      total: events.length,
      accepted,
      duplicates,
    };
  }

  async recordArticleView(params: {
    articleSlug: string;
    userId?: string | null;
    sessionId?: string | null;
    occurredAt?: Date;
  }) {
    const user = params.userId
      ? await this.em.findOne(User, { id: params.userId })
      : null;

    return this.storeEvent(user, {
      eventType: AnalyticsEventType.ARTICLE_VIEW,
      targetType: FavoriteTargetType.ARTICLE,
      targetSlug: params.articleSlug,
      sessionId: params.sessionId ?? undefined,
      occurredAt: params.occurredAt,
    });
  }

  async recordVegetableAddedToBed(params: {
    userId: string;
    vegetableSlug: string;
    bedId?: string;
    occurredAt?: Date;
  }) {
    const user = await this.em.findOne(User, { id: params.userId });

    return this.storeEvent(user, {
      eventType: AnalyticsEventType.VEGETABLE_ADDED_TO_BED,
      targetType: FavoriteTargetType.VEGETABLE,
      targetSlug: params.vegetableSlug,
      occurredAt: params.occurredAt,
      metadata: params.bedId ? { bedId: params.bedId } : undefined,
    });
  }

  async applyFavoriteDelta(
    targetType: FavoriteTargetType,
    targetSlug: string,
    delta: 1 | -1,
  ) {
    const conn = this.em.getConnection();

    if (targetType === FavoriteTargetType.ARTICLE) {
      if (delta > 0) {
        await conn.execute(
          `insert into article_metrics
             (article_slug, views_total, engaged_seconds_total, scroll50_count, scroll90_count, favorite_count, updated_at)
           values (?, 0, 0, 0, 0, 1, now())
           on conflict (article_slug)
           do update set
             favorite_count = article_metrics.favorite_count + 1,
             updated_at = now()`,
          [targetSlug],
          'run',
        );
      } else {
        await conn.execute(
          `update article_metrics
             set favorite_count = greatest(0, favorite_count - 1),
                 updated_at = now()
           where article_slug = ?`,
          [targetSlug],
          'run',
        );
      }
      return;
    }

    if (targetType === FavoriteTargetType.VEGETABLE) {
      if (delta > 0) {
        await conn.execute(
          `insert into vegetable_popularity
             (vegetable_slug, add_count_total, favorite_count, last_added_at, updated_at)
           values (?, 0, 1, null, now())
           on conflict (vegetable_slug)
           do update set
             favorite_count = vegetable_popularity.favorite_count + 1,
             updated_at = now()`,
          [targetSlug],
          'run',
        );
      } else {
        await conn.execute(
          `update vegetable_popularity
             set favorite_count = greatest(0, favorite_count - 1),
                 updated_at = now()
           where vegetable_slug = ?`,
          [targetSlug],
          'run',
        );
      }
    }
  }

  async listPopularVegetables(query: PopularVegetablesQueryDto) {
    const conn = this.em.getConnection();
    const { limit, sort, windowDays } = query;

    if (sort === 'adds' && windowDays) {
      const rows = await conn.execute<PopularVegetableRow[]>(
        `select
          e.target_slug as "vegetableSlug",
          count(*)::int as "addCountWindow",
          coalesce(vp.add_count_total, 0)::int as "addCountTotal",
          coalesce(vp.favorite_count, 0)::int as "favoriteCount",
          max(e.occurred_at) as "lastAddedAt",
          v.id,
          v.name,
          v.image_url as "imageUrl"
        from analytics_events e
        left join vegetable_popularity vp on vp.vegetable_slug = e.target_slug
        left join vegetables v on v.slug = e.target_slug
        where e.event_type = ?
          and e.occurred_at >= (now() - (? * interval '1 day'))
        group by e.target_slug, vp.add_count_total, vp.favorite_count, v.id, v.name, v.image_url
        order by count(*) desc, coalesce(vp.add_count_total, 0) desc
        limit ?`,
        [AnalyticsEventType.VEGETABLE_ADDED_TO_BED, windowDays, limit],
        'all',
      );

      return {
        items: rows.map((row) => this.serializePopularVegetable(row, true)),
      };
    }

    const orderSql =
      sort === 'favorites'
        ? 'vp.favorite_count desc, vp.add_count_total desc'
        : 'vp.add_count_total desc, vp.favorite_count desc';

    const rows = await conn.execute<PopularVegetableRow[]>(
      `select
        vp.vegetable_slug as "vegetableSlug",
        vp.add_count_total as "addCountTotal",
        vp.favorite_count as "favoriteCount",
        vp.last_added_at as "lastAddedAt",
        v.id,
        v.name,
        v.image_url as "imageUrl"
      from vegetable_popularity vp
      left join vegetables v on v.slug = vp.vegetable_slug
      order by ${orderSql}
      limit ?`,
      [limit],
      'all',
    );

    return {
      items: rows.map((row) => this.serializePopularVegetable(row, false)),
    };
  }

  async listPopularArticles(query: PopularArticlesQueryDto) {
    const conn = this.em.getConnection();
    const { limit, sort } = query;

    const orderByMap: Record<PopularArticlesQueryDto['sort'], string> = {
      views: 'am.views_total desc',
      engagedSeconds: 'am.engaged_seconds_total desc',
      scroll50: 'am.scroll50_count desc',
      scroll90: 'am.scroll90_count desc',
      favorites: 'am.favorite_count desc',
    };

    const rows = await conn.execute<PopularArticleRow[]>(
      `select
        am.article_slug as "articleSlug",
        am.views_total as "viewsTotal",
        am.engaged_seconds_total as "engagedSecondsTotal",
        am.scroll50_count as "scroll50Count",
        am.scroll90_count as "scroll90Count",
        am.favorite_count as "favoriteCount",
        a.id,
        a.title,
        a.excerpt,
        a.cover_image_url as "coverImageUrl",
        a.published_at as "publishedAt"
      from article_metrics am
      left join articles a on a.slug = am.article_slug
      order by ${orderByMap[sort]}, am.article_slug asc
      limit ?`,
      [limit],
      'all',
    );

    return {
      items: rows.map((row) => this.serializePopularArticle(row)),
    };
  }

  async getCmsDashboard(query: CmsDashboardQueryDto) {
    const conn = this.em.getConnection();
    const { top } = query;

    const [articleTotalsRaw] = await conn.execute<
      {
        viewsTotal: number | string;
        engagedSecondsTotal: number | string;
        scroll50Total: number | string;
        scroll90Total: number | string;
        favoriteTotal: number | string;
      }[]
    >(
      `select
        coalesce(sum(views_total), 0)::int as "viewsTotal",
        coalesce(sum(engaged_seconds_total), 0)::int as "engagedSecondsTotal",
        coalesce(sum(scroll50_count), 0)::int as "scroll50Total",
        coalesce(sum(scroll90_count), 0)::int as "scroll90Total",
        coalesce(sum(favorite_count), 0)::int as "favoriteTotal"
      from article_metrics`,
      [],
      'all',
    );

    const [vegetableTotalsRaw] = await conn.execute<
      {
        addTotal: number | string;
        favoriteTotal: number | string;
      }[]
    >(
      `select
        coalesce(sum(add_count_total), 0)::int as "addTotal",
        coalesce(sum(favorite_count), 0)::int as "favoriteTotal"
      from vegetable_popularity`,
      [],
      'all',
    );

    const [articleViews30dRaw] = await conn.execute<
      { count: number | string }[]
    >(
      `select count(*)::int as count
       from analytics_events
       where event_type = ?
         and occurred_at >= (now() - interval '30 day')`,
      [AnalyticsEventType.ARTICLE_VIEW],
      'all',
    );

    const [vegetableAdds30dRaw] = await conn.execute<
      { count: number | string }[]
    >(
      `select count(*)::int as count
       from analytics_events
       where event_type = ?
         and occurred_at >= (now() - interval '30 day')`,
      [AnalyticsEventType.VEGETABLE_ADDED_TO_BED],
      'all',
    );

    const topVegetables = await this.listPopularVegetables({
      limit: top,
      sort: 'adds',
    });
    const topArticles = await this.listPopularArticles({
      limit: top,
      sort: 'views',
    });

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        articleViewsTotal: this.toNumber(articleTotalsRaw?.viewsTotal),
        articleEngagedSecondsTotal: this.toNumber(
          articleTotalsRaw?.engagedSecondsTotal,
        ),
        articleScroll50Total: this.toNumber(articleTotalsRaw?.scroll50Total),
        articleScroll90Total: this.toNumber(articleTotalsRaw?.scroll90Total),
        articleFavoritesTotal: this.toNumber(articleTotalsRaw?.favoriteTotal),
        vegetableAddsTotal: this.toNumber(vegetableTotalsRaw?.addTotal),
        vegetableFavoritesTotal: this.toNumber(
          vegetableTotalsRaw?.favoriteTotal,
        ),
      },
      last30Days: {
        articleViews: this.toNumber(articleViews30dRaw?.count),
        vegetableAdds: this.toNumber(vegetableAdds30dRaw?.count),
      },
      top: {
        vegetablesByAdds: topVegetables.items,
        articlesByViews: topArticles.items,
      },
    };
  }

  private async storeEvent(user: User | null, event: TrackEventDto) {
    if (event.idempotencyKey) {
      const existing = await this.em.findOne(AnalyticsEvent, {
        idempotencyKey: event.idempotencyKey,
      });

      if (existing) {
        return false;
      }
    }

    const entity = new AnalyticsEvent();
    entity.user = user;
    entity.sessionId = event.sessionId ?? null;
    entity.eventType = event.eventType;
    entity.targetType = event.targetType;
    entity.targetSlug = event.targetSlug;
    entity.valueInt = event.valueInt ?? null;
    entity.valueNum = event.valueNum ?? null;
    entity.metadata = event.metadata ?? {};
    entity.occurredAt = event.occurredAt ?? new Date();
    entity.idempotencyKey = event.idempotencyKey ?? null;

    await this.em.persistAndFlush(entity);
    await this.applyAggregates(entity);

    return true;
  }

  private async applyAggregates(event: AnalyticsEvent) {
    const conn = this.em.getConnection();

    if (event.eventType === AnalyticsEventType.VEGETABLE_ADDED_TO_BED) {
      await conn.execute(
        `insert into vegetable_popularity
           (vegetable_slug, add_count_total, favorite_count, last_added_at, updated_at)
         values (?, 1, 0, ?, now())
         on conflict (vegetable_slug)
         do update set
           add_count_total = vegetable_popularity.add_count_total + 1,
           last_added_at = greatest(
             coalesce(vegetable_popularity.last_added_at, to_timestamp(0)),
             excluded.last_added_at
           ),
           updated_at = now()`,
        [event.targetSlug, event.occurredAt],
        'run',
      );
      return;
    }

    if (event.targetType !== FavoriteTargetType.ARTICLE) {
      return;
    }

    const views = event.eventType === AnalyticsEventType.ARTICLE_VIEW ? 1 : 0;
    const engagedSeconds =
      event.eventType === AnalyticsEventType.ARTICLE_ENGAGED
        ? Math.max(0, event.valueInt ?? 0)
        : 0;
    const scroll50 =
      event.eventType === AnalyticsEventType.ARTICLE_SCROLL_50 ? 1 : 0;
    const scroll90 =
      event.eventType === AnalyticsEventType.ARTICLE_SCROLL_90 ? 1 : 0;

    await conn.execute(
      `insert into article_metrics
         (article_slug, views_total, engaged_seconds_total, scroll50_count, scroll90_count, favorite_count, updated_at)
       values (?, ?, ?, ?, ?, 0, now())
       on conflict (article_slug)
       do update set
         views_total = article_metrics.views_total + excluded.views_total,
         engaged_seconds_total = article_metrics.engaged_seconds_total + excluded.engaged_seconds_total,
         scroll50_count = article_metrics.scroll50_count + excluded.scroll50_count,
         scroll90_count = article_metrics.scroll90_count + excluded.scroll90_count,
         updated_at = now()`,
      [event.targetSlug, views, engagedSeconds, scroll50, scroll90],
      'run',
    );
  }

  private serializePopularVegetable(
    row: PopularVegetableRow,
    withWindow: boolean,
  ) {
    return {
      vegetableSlug: row.vegetableSlug,
      addCountTotal: this.toNumber(row.addCountTotal),
      addCountWindow: withWindow
        ? this.toNumber(row.addCountWindow)
        : undefined,
      favoriteCount: this.toNumber(row.favoriteCount),
      lastAddedAt: row.lastAddedAt
        ? new Date(row.lastAddedAt).toISOString()
        : null,
      vegetable: {
        id: row.id ?? null,
        name: row.name ?? null,
        imageUrl: row.imageUrl ?? null,
      },
    };
  }

  private serializePopularArticle(row: PopularArticleRow) {
    return {
      articleSlug: row.articleSlug,
      viewsTotal: this.toNumber(row.viewsTotal),
      engagedSecondsTotal: this.toNumber(row.engagedSecondsTotal),
      scroll50Count: this.toNumber(row.scroll50Count),
      scroll90Count: this.toNumber(row.scroll90Count),
      favoriteCount: this.toNumber(row.favoriteCount),
      article: {
        id: row.id ?? null,
        title: row.title ?? null,
        excerpt: row.excerpt ?? null,
        coverImageUrl: row.coverImageUrl ?? null,
        publishedAt: row.publishedAt
          ? new Date(row.publishedAt).toISOString()
          : null,
      },
    };
  }

  private toNumber(value: number | string | undefined | null): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}
