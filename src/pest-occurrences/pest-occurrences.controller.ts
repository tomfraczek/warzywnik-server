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
import { PestOccurrencesService } from './pest-occurrences.service';
import {
  createPestOccurrenceSchema,
  listPestOccurrencesQuerySchema,
  updatePestOccurrenceSchema,
  CreatePestOccurrenceDto,
  ListPestOccurrencesQueryDto,
  UpdatePestOccurrenceDto,
} from './dto/pest-occurrence.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller()
export class PestOccurrencesController {
  constructor(
    private readonly pestOccurrencesService: PestOccurrencesService,
  ) {}

  @Get('v1/plantings/:plantingId/pest-occurrences')
  list(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Query(new ZodValidationPipe(listPestOccurrencesQuerySchema))
    query: ListPestOccurrencesQueryDto,
  ) {
    return this.pestOccurrencesService.list(
      req.userEntity as User,
      plantingId,
      query,
    );
  }

  @Post('v1/plantings/:plantingId/pest-occurrences')
  create(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Body(new ZodValidationPipe(createPestOccurrenceSchema))
    body: CreatePestOccurrenceDto,
  ) {
    return this.pestOccurrencesService.create(
      req.userEntity as User,
      plantingId,
      body,
    );
  }

  @Patch('v1/pest-occurrences/:id')
  update(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePestOccurrenceSchema))
    body: UpdatePestOccurrenceDto,
  ) {
    return this.pestOccurrencesService.update(req.userEntity as User, id, body);
  }

  @Get('v1/pest-occurrences/:id/recommended-actions')
  getRecommendedActions(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.pestOccurrencesService.getRecommendedActions(
      req.userEntity as User,
      id,
    );
  }

  @Delete('v1/pest-occurrences/:id')
  @HttpCode(204)
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.pestOccurrencesService.remove(req.userEntity as User, id);
  }
}
