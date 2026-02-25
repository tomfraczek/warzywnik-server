import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import {
  geoReverseQuerySchema,
  geoSearchQuerySchema,
  type GeoReverseQueryDto,
  type GeoSearchQueryDto,
} from './dto/geo.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type GeoReverseResponseDto,
  type GeoSearchResponseDto,
} from './dto/geo.types';
import { GeoThrottleGuard } from './geo-throttle.guard';

@Controller('v1/geo')
@UseGuards(GeoThrottleGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('search')
  search(
    @Query(new ZodValidationPipe(geoSearchQuerySchema))
    query: GeoSearchQueryDto,
  ): Promise<GeoSearchResponseDto> {
    return this.geoService.search(query);
  }

  @Get('reverse')
  reverse(
    @Query(new ZodValidationPipe(geoReverseQuerySchema))
    query: GeoReverseQueryDto,
  ): Promise<GeoReverseResponseDto> {
    return this.geoService.reverse(query);
  }
}
