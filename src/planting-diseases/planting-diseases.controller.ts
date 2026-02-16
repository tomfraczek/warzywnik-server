import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PlantingDiseasesService } from './planting-diseases.service';
import {
  createPlantingDiseaseSchema,
  listPlantingDiseasesQuerySchema,
  updatePlantingDiseaseSchema,
  CreatePlantingDiseaseDto,
  ListPlantingDiseasesQueryDto,
  UpdatePlantingDiseaseDto,
} from './dto/planting-disease.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/plantings/:plantingId/diseases')
export class PlantingDiseasesController {
  constructor(
    private readonly plantingDiseasesService: PlantingDiseasesService,
  ) {}

  @Get()
  list(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Query(new ZodValidationPipe(listPlantingDiseasesQuerySchema))
    query: ListPlantingDiseasesQueryDto,
  ) {
    return this.plantingDiseasesService.list(
      req.userEntity as User,
      plantingId,
      query,
    );
  }

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Body(new ZodValidationPipe(createPlantingDiseaseSchema))
    body: CreatePlantingDiseaseDto,
  ) {
    return this.plantingDiseasesService.create(
      req.userEntity as User,
      plantingId,
      body,
    );
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePlantingDiseaseSchema))
    body: UpdatePlantingDiseaseDto,
  ) {
    return this.plantingDiseasesService.update(
      req.userEntity as User,
      plantingId,
      id,
      body,
    );
  }
}
