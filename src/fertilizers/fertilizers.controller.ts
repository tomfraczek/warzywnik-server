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
import { FertilizersService } from './fertilizers.service';
import {
  createFertilizerTypeSchema,
  listFertilizerTypesQuerySchema,
  updateFertilizerTypeSchema,
  CreateFertilizerTypeDto,
  ListFertilizerTypesQueryDto,
  UpdateFertilizerTypeDto,
} from './dto/fertilizer.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller()
export class FertilizersController {
  constructor(private readonly fertilizersService: FertilizersService) {}

  @Get('fertilizers')
  @UsePipes(new ZodValidationPipe(listFertilizerTypesQuerySchema))
  list(@Query() query: ListFertilizerTypesQueryDto) {
    return this.fertilizersService.list(query);
  }

  @Get('fertilizers/:id')
  get(@Param('id') id: string) {
    return this.fertilizersService.getByIdOrSlug(id);
  }

  @Post('v1/fertilizers')
  @UsePipes(new ZodValidationPipe(createFertilizerTypeSchema))
  create(@Body() body: CreateFertilizerTypeDto) {
    return this.fertilizersService.create(body);
  }

  @Patch('v1/fertilizers/:id')
  @UsePipes(new ZodValidationPipe(updateFertilizerTypeSchema))
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateFertilizerTypeDto,
  ) {
    return this.fertilizersService.update(id, body);
  }

  @Delete('v1/fertilizers/:id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.fertilizersService.remove(id);
  }
}
