// src/vegetables/vegetables.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { VegetablesService } from './vegetables.service';
import { createVegetableSchema } from './dto/create-vegetable.dto';
import { updateVegetableSchema } from './dto/update-vegetable.dto';

@Controller('vegetables')
export class VegetablesController {
  constructor(private readonly vegetablesService: VegetablesService) {}

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.vegetablesService.findAll(lang);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Parameter "slug" is required');
    }
    return this.vegetablesService.checkSlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.vegetablesService.findOne(id, lang);
  }

  @Post()
  create(@Body() body: z.infer<typeof createVegetableSchema>) {
    const data = createVegetableSchema.parse(body);
    return this.vegetablesService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: z.infer<typeof updateVegetableSchema>,
  ) {
    const data = updateVegetableSchema.parse(body);
    return this.vegetablesService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.vegetablesService.delete(id);
  }
}
