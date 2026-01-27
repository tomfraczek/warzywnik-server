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
import { VegetablesService } from './vegetables.service';
import {
  createVegetableSchema,
  listVegetablesQuerySchema,
  updateVegetableSchema,
  CreateVegetableDto,
  ListVegetablesQueryDto,
  UpdateVegetableDto,
} from './dto/vegetable.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/vegetables')
export class VegetablesController {
  constructor(private readonly vegetablesService: VegetablesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listVegetablesQuerySchema))
    query: ListVegetablesQueryDto,
  ) {
    return this.vegetablesService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.vegetablesService.getById(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createVegetableSchema))
    body: CreateVegetableDto,
  ) {
    return this.vegetablesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateVegetableSchema))
    body: UpdateVegetableDto,
  ) {
    return this.vegetablesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.vegetablesService.remove(id);
  }
}
