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
  createActionTaskSchema,
  listActionTasksQuerySchema,
  patchActionTaskSchema,
  CreateActionTaskDto,
  ListActionTasksQueryDto,
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
    @Body(new ZodValidationPipe(createActionTaskSchema))
    body: CreateActionTaskDto,
  ) {
    return this.actionTasksService.createForPlanting(
      req.userEntity as User,
      plantingId,
      body,
    );
  }

  @Get('v1/plantings/:plantingId/action-tasks')
  listForPlanting(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Query(new ZodValidationPipe(listActionTasksQuerySchema))
    query: ListActionTasksQueryDto,
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
    @Query(new ZodValidationPipe(listActionTasksQuerySchema))
    query: ListActionTasksQueryDto,
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
