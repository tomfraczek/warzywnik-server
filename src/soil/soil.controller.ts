import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { SoilsService } from './soil.service';
import { createSoilSchema } from './dto/create-soil.dto';
import { updateSoilSchema } from './dto/update-soil.dto';

@Controller('soil')
export class SoilsController {
  constructor(private readonly soilsService: SoilsService) {}

  @Get()
  findAll() {
    return this.soilsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.soilsService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const data = createSoilSchema.parse(body);
    return this.soilsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const data = updateSoilSchema.parse(body);
    return this.soilsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.soilsService.delete(id);
  }
}
