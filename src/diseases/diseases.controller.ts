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
import { DiseasesService } from './diseases.service';
import {
  createDiseaseSchema,
  listDiseasesQuerySchema,
  updateDiseaseSchema,
  CreateDiseaseDto,
  ListDiseasesQueryDto,
  UpdateDiseaseDto,
} from './dto/disease.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/diseases')
export class DiseasesController {
  constructor(private readonly diseasesService: DiseasesService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listDiseasesQuerySchema))
  list(@Query() query: ListDiseasesQueryDto) {
    return this.diseasesService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.diseasesService.getById(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createDiseaseSchema))
  create(@Body() body: CreateDiseaseDto) {
    return this.diseasesService.create(body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateDiseaseSchema))
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDiseaseDto,
  ) {
    return this.diseasesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.diseasesService.remove(id);
  }
}
