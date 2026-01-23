import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
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
  @UsePipes(new ZodValidationPipe(listVegetablesQuerySchema))
  list(@Query() query: ListVegetablesQueryDto) {
    return this.vegetablesService.list(query);
  }

  @Get(':idOrSlug')
  get(@Param('idOrSlug') idOrSlug: string) {
    return this.vegetablesService.getByIdOrSlug(idOrSlug);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createVegetableSchema))
  create(@Body() body: CreateVegetableDto) {
    return this.vegetablesService.create(body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateVegetableSchema))
  update(@Param('id') id: string, @Body() body: UpdateVegetableDto) {
    return this.vegetablesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.vegetablesService.remove(id);
  }
}
