import { Module } from '@nestjs/common';
import { LocationEventsService } from './location-events.service';

@Module({
  providers: [LocationEventsService],
  exports: [LocationEventsService],
})
export class LocationsModule {}
