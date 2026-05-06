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
import { BedsService } from './beds.service';
import {
  createBedQuickActionSchema,
  createBedSchema,
  listBedsQuerySchema,
  updateBedSchema,
  CreateBedQuickActionDto,
  CreateBedDto,
  ListBedsQueryDto,
  UpdateBedDto,
} from './dto/bed.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

@Controller('v1/beds')
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Get()
  list(
    @Req() req: { userEntity?: User },
    @Query(new ZodValidationPipe(listBedsQuerySchema))
    query: ListBedsQueryDto,
  ) {
    return this.bedsService.list(req.userEntity as User, query);
  }

  @Get(':id')
  get(@Req() req: { userEntity?: User }, @Param('id') id: string) {
    return this.bedsService.getById(req.userEntity as User, id);
  }

  @Post()
  create(
    @Req() req: { userEntity?: User },
    @Body(new ZodValidationPipe(createBedSchema)) body: CreateBedDto,
  ) {
    return this.bedsService.create(req.userEntity as User, body);
  }

  @Patch(':id')
  update(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateBedSchema)) body: UpdateBedDto,
  ) {
    return this.bedsService.update(req.userEntity as User, id, body);
  }

  @Post(':bedId/quick-actions')
  createQuickAction(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Body(new ZodValidationPipe(createBedQuickActionSchema))
    body: CreateBedQuickActionDto,
  ) {
    return this.bedsService.createQuickAction(
      req.userEntity as User,
      bedId,
      body,
    );
  }

  @Get(':bedId/quick-actions/notes')
  getQuickActionNotes(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
  ) {
    return this.bedsService.getQuickActionNotes(req.userEntity as User, bedId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.bedsService.remove(req.userEntity as User, id);
  }
}
