import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import {
  LOCATION_UPDATED_EVENT,
  type LocationUpdatedPayload,
  WEATHER_SNAPSHOT_UPDATED_EVENT,
  type WeatherSnapshotUpdatedPayload,
} from './location-events.constants';

@Injectable()
export class LocationEventsService {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(LocationEventsService.name);

  on(
    eventName:
      | typeof LOCATION_UPDATED_EVENT
      | typeof WEATHER_SNAPSHOT_UPDATED_EVENT,
    listener: (
      payload: LocationUpdatedPayload | WeatherSnapshotUpdatedPayload,
    ) => void,
  ): void {
    this.emitter.on(eventName, listener);
  }

  off(
    eventName:
      | typeof LOCATION_UPDATED_EVENT
      | typeof WEATHER_SNAPSHOT_UPDATED_EVENT,
    listener: (
      payload: LocationUpdatedPayload | WeatherSnapshotUpdatedPayload,
    ) => void,
  ): void {
    this.emitter.off(eventName, listener);
  }

  emitLocationUpdated(payload: LocationUpdatedPayload): void {
    this.emitter.emit(LOCATION_UPDATED_EVENT, payload);
    this.logger.debug(
      `Emitted ${LOCATION_UPDATED_EVENT} for user=${payload.userId}`,
    );
  }

  emitWeatherSnapshotUpdated(payload: WeatherSnapshotUpdatedPayload): void {
    this.emitter.emit(WEATHER_SNAPSHOT_UPDATED_EVENT, payload);
    this.logger.debug(
      `Emitted ${WEATHER_SNAPSHOT_UPDATED_EVENT} for user=${payload.userId} stale=${payload.stale}`,
    );
  }
}
