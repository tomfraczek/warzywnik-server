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
  ValidationPipe,
} from '@nestjs/common';
import { SoilsService } from './soils.service';
import {
  CreateSoilDto,
  ListSoilsQueryDto,
  UpdateSoilDto,
} from './dto/soil.dto';

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
});

@Controller('v1/soils')
export class SoilsController {
  constructor(private readonly soilsService: SoilsService) {}

  @Get()
  @UsePipes(validationPipe)
  list(@Query() query: ListSoilsQueryDto) {
    return this.soilsService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.soilsService.getById(id);
  }

  @Post()
  @UsePipes(validationPipe)
  create(@Body() body: CreateSoilDto) {
    return this.soilsService.create(body);
  }

  @Patch(':id')
  @UsePipes(validationPipe)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSoilDto,
  ) {
    return this.soilsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.soilsService.remove(id);
  }
}
