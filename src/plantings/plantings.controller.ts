import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PlantingsService } from './plantings.service';
import {
  createPlantingQuickActionSchema,
  createHarvestResultSchema,
  createPlantingTimelineSchema,
  getPlantingQuerySchema,
  harvestResultSchema,
  listPlantingsQuerySchema,
  recomputePlantingActionsSchema,
  RecomputePlantingActionsDto,
  taskDecisionsDebugQuerySchema,
  TaskDecisionsDebugQueryDto,
  updateHarvestResultSchema,
  updatePlantingTimelineSchema,
  CreateHarvestResultDto,
  CreatePlantingQuickActionDto,
  CreatePlantingDto,
  GetPlantingQueryDto,
  HarvestResultDto,
  ListPlantingsQueryDto,
  UpdateHarvestResultDto,
  UpdatePlantingDto,
} from './dto/planting.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

@Controller('v1/plantings')
export class PlantingsController {
  constructor(private readonly plantingsService: PlantingsService) {}

  @Get()
  list(
    @Req() req: { userEntity?: User },
    @Query(new ZodValidationPipe(listPlantingsQuerySchema))
    query: ListPlantingsQueryDto,
  ) {
    return this.plantingsService.list(req.userEntity as User, query);
  }

  @Get(':id')
  get(
    @Req() req: { userEntity?: User },
    @Param('id') id: string,
    @Query(new ZodValidationPipe(getPlantingQuerySchema))
    query: GetPlantingQueryDto,
  ) {
    return this.plantingsService.getById(
      req.userEntity as User,
      id,
      query.includeWarnings,
    );
  }

  @Get(':id/available-statuses')
  getAvailableStatuses(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingsService.getAvailableStatuses(
      req.userEntity as User,
      id,
    );
  }

  @Post()
  create(
    @Req() req: { userEntity?: User },
    @Body(new ZodValidationPipe(createPlantingTimelineSchema))
    body: CreatePlantingDto,
  ) {
    return this.plantingsService.create(req.userEntity as User, body);
  }

  @Patch(':id')
  update(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePlantingTimelineSchema))
    body: UpdatePlantingDto,
  ) {
    return this.plantingsService.update(req.userEntity as User, id, body);
  }

  @Post(':id/recompute-actions')
  recomputeActions(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(recomputePlantingActionsSchema))
    body: RecomputePlantingActionsDto,
  ) {
    return this.plantingsService.recomputeActions(
      req.userEntity as User,
      id,
      body,
    );
  }

  @Get(':id/task-generation-preview')
  getTaskGenerationPreview(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingsService.getTaskGenerationPreview(
      req.userEntity as User,
      id,
    );
  }

  @Get(':id/task-decisions/debug')
  getTaskDecisionsDebug(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(taskDecisionsDebugQuerySchema))
    query: TaskDecisionsDebugQueryDto,
  ) {
    return this.plantingsService.getTaskDecisionsDebug(
      req.userEntity as User,
      id,
      Boolean(query.verbose),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.plantingsService.remove(req.userEntity as User, id);
  }

  @Patch(':id/harvest-result')
  updateLegacyHarvestResult(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(harvestResultSchema)) body: HarvestResultDto,
  ) {
    return this.plantingsService.updateHarvestResult(
      req.userEntity as User,
      id,
      body,
    );
  }

  @Post(':id/quick-actions')
  createQuickAction(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(createPlantingQuickActionSchema))
    body: CreatePlantingQuickActionDto,
  ) {
    return this.plantingsService.createQuickAction(
      req.userEntity as User,
      id,
      body,
    );
  }

  @Get(':id/quick-actions/notes')
  getQuickActionNotes(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingsService.getQuickActionNotes(
      req.userEntity as User,
      id,
    );
  }

  @Post(':id/harvest-results')
  createHarvestResult(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(createHarvestResultSchema))
    body: CreateHarvestResultDto,
  ) {
    return this.plantingsService.createHarvestResult(
      req.userEntity as User,
      id,
      body,
    );
  }

  @Patch(':id/harvest-results/:recordId')
  updateHarvestResult(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('recordId', new ParseUUIDPipe()) recordId: string,
    @Body(new ZodValidationPipe(updateHarvestResultSchema))
    body: UpdateHarvestResultDto,
  ) {
    return this.plantingsService.updateHarvestResultRecord(
      req.userEntity as User,
      id,
      recordId,
      body,
    );
  }

  @Delete(':id/harvest-results/:recordId')
  @HttpCode(204)
  async deleteHarvestResult(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('recordId', new ParseUUIDPipe()) recordId: string,
  ) {
    await this.plantingsService.deleteHarvestResultRecord(
      req.userEntity as User,
      id,
      recordId,
    );
  }
}
