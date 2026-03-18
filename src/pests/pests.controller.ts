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
} from '@nestjs/common';
import { PestsService } from './pests.service';
import {
  createPestSchema,
  deletePestsBulkSchema,
  listPestsQuerySchema,
  updatePestSchema,
  CreatePestDto,
  DeletePestsBulkDto,
  ListPestsQueryDto,
  UpdatePestDto,
} from './dto/pest.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/pests')
export class PestsController {
  constructor(private readonly pestsService: PestsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listPestsQuerySchema))
    query: ListPestsQueryDto,
  ) {
    return this.pestsService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pestsService.getById(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPestSchema)) body: CreatePestDto) {
    return this.pestsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePestSchema)) body: UpdatePestDto,
  ) {
    return this.pestsService.update(id, body);
  }

  @Delete()
  @HttpCode(204)
  async removeBulk(
    @Body(new ZodValidationPipe(deletePestsBulkSchema))
    body: DeletePestsBulkDto,
  ) {
    await this.pestsService.removeMany(body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.pestsService.remove(id);
  }
}
