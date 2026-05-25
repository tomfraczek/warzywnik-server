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
import { ActionTasksService } from './action-tasks.service';
import {
  createBedActionTasksBulkSchema,
  CreateBedActionTasksBulkDto,
  createManualActionTaskSchema,
  CreateManualActionTaskDto,
  createPlantingActionTasksBulkSchema,
  CreatePlantingActionTasksBulkDto,
  listBedActionTasksQuerySchema,
  listPlantingActionTasksQuerySchema,
  patchActionTaskSchema,
  ListBedActionTasksQueryDto,
  ListPlantingActionTasksQueryDto,
  PatchActionTaskDto,
} from './dto/action-task.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller()
export class ActionTasksController {
  constructor(private readonly actionTasksService: ActionTasksService) {}

  @Post('v1/plantings/:plantingId/action-tasks')
  createForPlanting(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Body(new ZodValidationPipe(createManualActionTaskSchema))
    body: CreateManualActionTaskDto,
  ) {
    return this.actionTasksService.createForPlanting(
      req.userEntity as User,
      plantingId,
      body,
    );
  }

  @Post('v1/beds/:bedId/action-tasks')
  createForBed(
    @Req() req: RequestWithUser,
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Body(new ZodValidationPipe(createManualActionTaskSchema))
    body: CreateManualActionTaskDto,
  ) {
    return this.actionTasksService.createForBed(
      req.userEntity as User,
      bedId,
      body,
    );
  }

  @Get('v1/plantings/:plantingId/action-tasks')
  listForPlanting(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Query(new ZodValidationPipe(listPlantingActionTasksQuerySchema))
    query: ListPlantingActionTasksQueryDto,
  ) {
    return this.actionTasksService.listForPlanting(
      req.userEntity as User,
      plantingId,
      query,
    );
  }

  @Get('v1/beds/:bedId/action-tasks')
  listForBed(
    @Req() req: RequestWithUser,
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Query(new ZodValidationPipe(listBedActionTasksQuerySchema))
    query: ListBedActionTasksQueryDto,
  ) {
    return this.actionTasksService.listForBed(
      req.userEntity as User,
      bedId,
      query,
    );
  }

  @Post('v1/beds/:bedId/action-tasks/bulk')
  createBulkForBed(
    @Req() req: RequestWithUser,
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Body(new ZodValidationPipe(createBedActionTasksBulkSchema))
    body: CreateBedActionTasksBulkDto,
  ) {
    return this.actionTasksService.createBulkForBed(
      req.userEntity as User,
      bedId,
      body,
    );
  }

  @Post('v1/plantings/:plantingId/action-tasks/bulk')
  createBulkForPlanting(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Body(new ZodValidationPipe(createPlantingActionTasksBulkSchema))
    body: CreatePlantingActionTasksBulkDto,
  ) {
    return this.actionTasksService.createBulkForPlanting(
      req.userEntity as User,
      plantingId,
      body,
    );
  }

  @Patch('v1/action-tasks/:id')
  patch(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(patchActionTaskSchema))
    body: PatchActionTaskDto,
  ) {
    return this.actionTasksService.patch(req.userEntity as User, id, body);
  }

  @Delete('v1/action-tasks/:id')
  @HttpCode(204)
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.actionTasksService.remove(req.userEntity as User, id);
  }
}
