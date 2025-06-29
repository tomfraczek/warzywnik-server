import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SoilTranslationService } from '../soil-translation.service';
import { createSoilTranslationSchema } from '../dto/create-soil-translation.dto';
import { updateSoilTranslationSchema } from '../dto/update-soil-translation.dto';

@Controller('soil-translations')
export class SoilTranslationController {
  constructor(private readonly service: SoilTranslationService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const data = createSoilTranslationSchema.parse(body);
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const data = updateSoilTranslationSchema.parse(body);
    return this.service.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
