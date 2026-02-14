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
  list(
    @Query(new ZodValidationPipe(listDiseasesQuerySchema))
    query: ListDiseasesQueryDto,
  ) {
    return this.diseasesService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.diseasesService.getById(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createDiseaseSchema)) body: CreateDiseaseDto,
  ) {
    return this.diseasesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateDiseaseSchema)) body: UpdateDiseaseDto,
  ) {
    return this.diseasesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.diseasesService.remove(id);
  }
}
