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
  Req,
} from '@nestjs/common';
import { PestOccurrencesService } from './pest-occurrences.service';
import {
  createPestOccurrenceSchema,
  updatePestOccurrenceSchema,
  CreatePestOccurrenceDto,
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

  @Get('v1/beds/:bedId/pest-occurrences')
  list(
    @Req() req: RequestWithUser,
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
  ) {
    return this.pestOccurrencesService.list(req.userEntity as User, bedId);
  }

  @Post('v1/beds/:bedId/pest-occurrences')
  create(
    @Req() req: RequestWithUser,
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
    @Body(new ZodValidationPipe(createPestOccurrenceSchema))
    body: CreatePestOccurrenceDto,
  ) {
    return this.pestOccurrencesService.create(
      req.userEntity as User,
      bedId,
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

  @Delete('v1/pest-occurrences/:id')
  @HttpCode(204)
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.pestOccurrencesService.remove(req.userEntity as User, id);
  }
}
