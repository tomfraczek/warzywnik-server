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
  UsePipes,
} from '@nestjs/common';
import { PestsService } from './pests.service';
import {
  createPestSchema,
  listPestsQuerySchema,
  updatePestSchema,
  CreatePestDto,
  ListPestsQueryDto,
  UpdatePestDto,
} from './dto/pest.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/pests')
export class PestsController {
  constructor(private readonly pestsService: PestsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listPestsQuerySchema))
  list(@Query() query: ListPestsQueryDto) {
    return this.pestsService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pestsService.getById(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createPestSchema))
  create(@Body() body: CreatePestDto) {
    return this.pestsService.create(body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updatePestSchema))
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePestDto,
  ) {
    return this.pestsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.pestsService.remove(id);
  }
}
