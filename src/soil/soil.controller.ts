import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Delete,
  Query,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { SoilsService } from './soil.service';
import { createSoilSchema } from './dto/create-soil.dto';
import { updateSoilSchema } from './dto/update-soil.dto';
import { z } from 'zod';

type CreateSoilDto = z.infer<typeof createSoilSchema>;
type UpdateSoilDto = z.infer<typeof updateSoilSchema>;

@Controller('soil')
export class SoilsController {
  constructor(private readonly soilsService: SoilsService) {}

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.soilsService.findAll(lang);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Parameter "slug" is required');
    }
    return this.soilsService.checkSlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.soilsService.findOne(id, lang);
  }

  @Post()
  create(@Body() body: CreateSoilDto) {
    const data = createSoilSchema.parse(body);
    return this.soilsService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSoilDto) {
    const data = updateSoilSchema.parse(body);
    return this.soilsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.soilsService.delete(id);
  }
}
