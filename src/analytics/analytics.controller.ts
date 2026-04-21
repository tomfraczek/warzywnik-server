import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/user.entity';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CmsDashboardQueryDto,
  cmsDashboardQuerySchema,
  PopularArticlesQueryDto,
  popularArticlesQuerySchema,
  PopularVegetablesQueryDto,
  popularVegetablesQuerySchema,
  TrackEventsDto,
  trackEventsSchema,
} from './dto/analytics.schemas';
import { Public } from '../auth/public.decorator';
import { AdminTokenGuard } from '../auth/admin-token.guard';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  trackEvents(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(trackEventsSchema)) body: TrackEventsDto,
  ) {
    return this.analyticsService.trackEvents(
      req.userEntity ?? null,
      body.events,
    );
  }

  @Get('vegetables/popular')
  listPopularVegetables(
    @Query(new ZodValidationPipe(popularVegetablesQuerySchema))
    query: PopularVegetablesQueryDto,
  ) {
    return this.analyticsService.listPopularVegetables(query);
  }

  @Get('articles/popular')
  listPopularArticles(
    @Query(new ZodValidationPipe(popularArticlesQuerySchema))
    query: PopularArticlesQueryDto,
  ) {
    return this.analyticsService.listPopularArticles(query);
  }
}

@Public()
@UseGuards(AdminTokenGuard)
@Controller('v1/cms/analytics')
export class CmsAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  dashboard(
    @Query(new ZodValidationPipe(cmsDashboardQuerySchema))
    query: CmsDashboardQueryDto,
  ) {
    return this.analyticsService.getCmsDashboard(query);
  }

  @Get('vegetables/popular')
  listPopularVegetables(
    @Query(new ZodValidationPipe(popularVegetablesQuerySchema))
    query: PopularVegetablesQueryDto,
  ) {
    return this.analyticsService.listPopularVegetables(query);
  }

  @Get('articles/popular')
  listPopularArticles(
    @Query(new ZodValidationPipe(popularArticlesQuerySchema))
    query: PopularArticlesQueryDto,
  ) {
    return this.analyticsService.listPopularArticles(query);
  }
}
