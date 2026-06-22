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
  Req,
  UseGuards,
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
import { PremiumGuard } from '../entitlements/premium.guard';
import { RequirePremium } from '../entitlements/require-premium.decorator';

type RequestWithUser = {
  userEntity?: User;
};

@Controller()
@UseGuards(PremiumGuard)
@RequirePremium('cropDiseaseHistory')
export class PlantingDiseasesController {
  constructor(
    private readonly plantingDiseasesService: PlantingDiseasesService,
  ) {}

  @Get('v1/plantings/:plantingId/disease-occurrences')
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

  @Post('v1/plantings/:plantingId/disease-occurrences')
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

  @Patch('v1/disease-occurrences/:id')
  update(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePlantingDiseaseSchema))
    body: UpdatePlantingDiseaseDto,
  ) {
    return this.plantingDiseasesService.updateById(
      req.userEntity as User,
      id,
      body,
    );
  }

  @Get('v1/disease-occurrences/:id/recommended-actions')
  getRecommendedActions(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plantingDiseasesService.getRecommendedActions(
      req.userEntity as User,
      id,
    );
  }

  @Delete('v1/disease-occurrences/:id')
  @HttpCode(204)
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.plantingDiseasesService.remove(req.userEntity as User, id);
  }
}
