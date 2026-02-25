import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoCacheService } from './geo-cache.service';
import { GeoThrottleGuard } from './geo-throttle.guard';
import { GeoCacheEntry } from './geo-cache-entry.entity';

@Module({
  imports: [MikroOrmModule.forFeature([GeoCacheEntry])],
  controllers: [GeoController],
  providers: [GeoService, GeoCacheService, GeoThrottleGuard],
  exports: [GeoService],
})
export class GeoModule {}
