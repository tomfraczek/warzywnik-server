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
} from '@nestjs/common';
import { PlantingsService } from './plantings.service';
import {
  createPlantingSchema,
  getPlantingQuerySchema,
  listPlantingsQuerySchema,
  updatePlantingSchema,
  CreatePlantingDto,
  GetPlantingQueryDto,
  ListPlantingsQueryDto,
  UpdatePlantingDto,
} from './dto/planting.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

@Controller('v1/plantings')
export class PlantingsController {
  constructor(private readonly plantingsService: PlantingsService) {}

  @Get()
  list(
    @Req() req: { userEntity?: User },
    @Query(new ZodValidationPipe(listPlantingsQuerySchema))
    query: ListPlantingsQueryDto,
  ) {
    return this.plantingsService.list(req.userEntity as User, query);
  }

  @Get(':id')
  get(
    @Req() req: { userEntity?: User },
    @Param('id') id: string,
    @Query(new ZodValidationPipe(getPlantingQuerySchema))
    query: GetPlantingQueryDto,
  ) {
    return this.plantingsService.getById(
      req.userEntity as User,
      id,
      query.includeWarnings,
    );
  }

  @Post()
  create(
    @Req() req: { userEntity?: User },
    @Body(new ZodValidationPipe(createPlantingSchema))
    body: CreatePlantingDto,
  ) {
    return this.plantingsService.create(req.userEntity as User, body);
  }

  @Patch(':id')
  update(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePlantingSchema))
    body: UpdatePlantingDto,
  ) {
    return this.plantingsService.update(req.userEntity as User, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.plantingsService.remove(req.userEntity as User, id);
  }
}
