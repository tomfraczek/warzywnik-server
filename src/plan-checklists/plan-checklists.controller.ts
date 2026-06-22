import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';
import {
  createManualPlanChecklistItemSchema,
  CreateManualPlanChecklistItemDto,
  getBedPlanQuerySchema,
  GetBedPlanQueryDto,
  patchPlanChecklistItemSchema,
  PatchPlanChecklistItemDto,
} from './dto/plan-checklist.schemas';
import { PlanChecklistsService } from './plan-checklists.service';
import { PremiumGuard } from '../entitlements/premium.guard';
import { RequirePremium } from '../entitlements/require-premium.decorator';

@Controller()
@UseGuards(PremiumGuard)
@RequirePremium('gardenPlanner')
export class PlanChecklistsController {
  constructor(private readonly planChecklistsService: PlanChecklistsService) {}

  @Get('v1/beds/:bedId/plan')
  getBedPlan(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Query(new ZodValidationPipe(getBedPlanQuerySchema))
    query: GetBedPlanQueryDto,
  ) {
    return this.planChecklistsService.getBedPlan(
      req.userEntity as User,
      bedId,
      Boolean(query.includeArchived),
    );
  }

  @Post('v1/beds/:bedId/plan/recompute')
  recomputeBedPlan(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
  ) {
    return this.planChecklistsService.recomputeForBed({
      user: req.userEntity as User,
      bedId,
      reason: 'MANUAL_RECOMPUTE',
    });
  }

  @Post('v1/beds/:bedId/plan/checklist-items')
  createManualChecklistItem(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Body(new ZodValidationPipe(createManualPlanChecklistItemSchema))
    body: CreateManualPlanChecklistItemDto,
  ) {
    return this.planChecklistsService.createManualItem(
      req.userEntity as User,
      bedId,
      body,
    );
  }

  @Patch('v1/plan-checklist/:itemId')
  patchChecklistItem(
    @Req() req: { userEntity?: User },
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body(new ZodValidationPipe(patchPlanChecklistItemSchema))
    body: PatchPlanChecklistItemDto,
  ) {
    return this.planChecklistsService.patchItem(
      req.userEntity as User,
      itemId,
      body,
    );
  }

  @Delete('v1/plan-checklist/:itemId')
  async suppressChecklistItem(
    @Req() req: { userEntity?: User },
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    await this.planChecklistsService.suppressItem(
      req.userEntity as User,
      itemId,
    );
    return { success: true };
  }
}
