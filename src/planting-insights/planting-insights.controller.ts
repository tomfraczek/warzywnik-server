import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { PlantingInsightsService } from './planting-insights.service';
import { User } from '../users/user.entity';

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
