import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import {
  LOCATION_UPDATED_EVENT,
  type LocationUpdatedPayload,
} from './location-events.constants';

@Injectable()
export class LocationEventsService implements OnModuleInit {
  private readonly emitter = new EventEmitter();

  onModuleInit(): void {
    this.emitter.on(
      LOCATION_UPDATED_EVENT,
      (payload: LocationUpdatedPayload) => {
        this.handleLocationUpdated(payload);
      },
    );
  }

  emitLocationUpdated(payload: LocationUpdatedPayload): void {
    this.emitter.emit(LOCATION_UPDATED_EVENT, payload);
  }

  private handleLocationUpdated(payload: LocationUpdatedPayload): void {
    void payload;
    // TODO(weather): enqueue weather refresh based on LOCATION_UPDATED event
  }
}
