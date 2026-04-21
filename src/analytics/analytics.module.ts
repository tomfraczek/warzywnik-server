import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  AnalyticsController,
  CmsAnalyticsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './analytics-event.entity';
import { ArticleMetric } from './article-metric.entity';
import { VegetablePopularity } from './vegetable-popularity.entity';
import { AdminTokenGuard } from '../auth/admin-token.guard';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      AnalyticsEvent,
      ArticleMetric,
      VegetablePopularity,
    ]),
  ],
  controllers: [AnalyticsController, CmsAnalyticsController],
  providers: [AnalyticsService, AdminTokenGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
