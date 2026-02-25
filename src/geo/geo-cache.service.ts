import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { GeoCacheEntry } from './geo-cache-entry.entity';

@Injectable()
export class GeoCacheService {
  constructor(private readonly em: EntityManager) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = await this.em.findOne(GeoCacheEntry, { cacheKey: key });

    if (!entry) {
      return null;
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      await this.em.nativeDelete(GeoCacheEntry, { cacheKey: key });
      return null;
    }

    return JSON.parse(entry.payload) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const payload = JSON.stringify(value);

    let entry = await this.em.findOne(GeoCacheEntry, { cacheKey: key });

    if (!entry) {
      entry = new GeoCacheEntry();
      entry.cacheKey = key;
      entry.payload = payload;
      entry.expiresAt = expiresAt;
      this.em.persist(entry);
      await this.em.flush();
      return;
    }

    entry.payload = payload;
    entry.expiresAt = expiresAt;
    await this.em.flush();
  }
}
