// src/vegetables/translation/vegetable-translation.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { VegetableTranslationService } from './vegetable-translation.service';
import { createVegetableTranslationSchema } from './dto/create-translation.dto';
import { updateVegetableTranslationSchema } from './dto/update-translation.dto';

@Controller('vegetable-translation')
export class VegetableTranslationController {
  constructor(
    private readonly vegetableTranslationService: VegetableTranslationService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vegetableTranslationService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const data = createVegetableTranslationSchema.parse(body);
    return this.vegetableTranslationService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const data = updateVegetableTranslationSchema.parse(body);
    return this.vegetableTranslationService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.vegetableTranslationService.delete(id);
  }
}
