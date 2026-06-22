import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlantingInsightsService } from './planting-insights.service';
import { User } from '../users/user.entity';
import { PremiumGuard } from '../entitlements/premium.guard';
import { RequirePremium } from '../entitlements/require-premium.decorator';

@Controller()
export class PlantingInsightsController {
  constructor(
    private readonly plantingInsightsService: PlantingInsightsService,
  ) {}

  @Get('v1/plantings/:id/timeline')
  getTimeline(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingInsightsService.getTimeline(req.userEntity as User, id);
  }

  @Get('v1/plantings/:id/season-comparison')
  @UseGuards(PremiumGuard)
  @RequirePremium('seasonStatistics')
  getSeasonComparison(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingInsightsService.getSeasonComparison(
      req.userEntity as User,
      id,
    );
  }

  @Get('v1/beds/:bedId/seasons')
  @UseGuards(PremiumGuard)
  @RequirePremium('seasonStatistics')
  getBedSeasons(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
  ) {
    return this.plantingInsightsService.getBedSeasons(
      req.userEntity as User,
      bedId,
    );
  }
}
