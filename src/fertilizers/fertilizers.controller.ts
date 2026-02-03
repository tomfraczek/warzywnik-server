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
import { FertilizersService } from './fertilizers.service';
import {
  createFertilizerTypeSchema,
  listFertilizerTypesQuerySchema,
  updateFertilizerTypeSchema,
  type CreateFertilizerTypeDto,
  type ListFertilizerTypesQueryDto,
  type UpdateFertilizerTypeDto,
} from './dto/fertilizer.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/fertilizers')
export class FertilizersController {
  constructor(private readonly fertilizersService: FertilizersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listFertilizerTypesQuerySchema))
    query: ListFertilizerTypesQueryDto,
  ) {
    return this.fertilizersService.list(query);
  }

  @Get(':id')
  get(@Param('id') idOrSlug: string) {
    return this.fertilizersService.getByIdOrSlug(idOrSlug);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createFertilizerTypeSchema))
    body: CreateFertilizerTypeDto,
  ) {
    return this.fertilizersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateFertilizerTypeSchema))
    body: UpdateFertilizerTypeDto,
  ) {
    return this.fertilizersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.fertilizersService.remove(id);
  }
}
