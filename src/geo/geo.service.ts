import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  GeoLang,
  GeoReverseResponseDto,
  GeoSearchItemDto,
  GeoSearchResponseDto,
} from './dto/geo.types';
import { GeoCacheService } from './geo-cache.service';

type NominatimSearchItem = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
};

type NominatimReverseResponse = {
  display_name: string;
};

type NominatimRequestOptions = {
  path: string;
  lang: GeoLang;
  timeoutMs: number;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly baseUrl =
    process.env.GEO_NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
  private readonly userAgent =
    process.env.GEO_PROVIDER_USER_AGENT ??
    'Warzywnik/1.0 (contact: support@warzywnik.app)';
  private readonly appEnv = process.env.APP_ENV ?? process.env.NODE_ENV;

  private static readonly SEARCH_TTL_SECONDS = 7 * 24 * 60 * 60;
  private static readonly REVERSE_TTL_SECONDS = 30 * 24 * 60 * 60;

  constructor(private readonly cache: GeoCacheService) {}

  async search(params: {
    q: string;
    limit: number;
    lang: GeoLang;
  }): Promise<GeoSearchResponseDto> {
    const cacheKey = this.buildSearchCacheKey(
      params.q,
      params.lang,
      params.limit,
    );
    const cached = await this.cache.get<GeoSearchResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const path = `/search?format=jsonv2&q=${encodeURIComponent(params.q)}&limit=${params.limit}&addressdetails=0`;
    const raw = await this.requestProvider<NominatimSearchItem[]>({
      path,
      lang: params.lang,
      timeoutMs: Number(process.env.GEO_PROVIDER_TIMEOUT_MS ?? 3500),
    });

    const mapped: GeoSearchResponseDto = raw
      .map((item) => this.mapSearchItem(item))
      .filter((item): item is GeoSearchItemDto => item !== null);

    await this.cache.set(cacheKey, mapped, GeoService.SEARCH_TTL_SECONDS);
    return mapped;
  }

  async reverse(params: {
    lat: number;
    lon: number;
    lang: GeoLang;
  }): Promise<GeoReverseResponseDto> {
    const rounded = this.roundCoordinates(params.lat, params.lon);
    const cacheKey = this.buildReverseCacheKey(
      rounded.lat,
      rounded.lon,
      params.lang,
    );
    const cached = await this.cache.get<GeoReverseResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const path = `/reverse?format=jsonv2&lat=${rounded.lat}&lon=${rounded.lon}&zoom=18&addressdetails=0`;
    const raw = await this.requestProvider<NominatimReverseResponse>({
      path,
      lang: params.lang,
      timeoutMs: Number(process.env.GEO_PROVIDER_TIMEOUT_MS ?? 3500),
    });

    const mapped: GeoReverseResponseDto = {
      label: raw.display_name ?? 'Unknown location',
    };

    await this.cache.set(cacheKey, mapped, GeoService.REVERSE_TTL_SECONDS);
    return mapped;
  }

  private mapSearchItem(item: NominatimSearchItem): GeoSearchItemDto | null {
    const lat = Number(item.lat);
    const lon = Number(item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !item.display_name) {
      return null;
    }

    return {
      placeId: String(item.place_id),
      label: item.display_name,
      lat,
      lon,
    };
  }

  private async requestProvider<T>(
    options: NominatimRequestOptions,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${options.path}`, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': options.lang,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const maskedPath = this.maskCoordinatesForLogs(options.path);
        this.logger.error(
          `Geo provider returned ${response.status} for path=${maskedPath}`,
        );
        throw new ServiceUnavailableException('Geo provider unavailable');
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('Geo provider timeout');
      }

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error('Geo provider request failed');
      throw new ServiceUnavailableException('Geo provider unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildSearchCacheKey(q: string, lang: GeoLang, limit: number): string {
    const digest = createHash('sha1')
      .update(q.trim().toLowerCase())
      .digest('hex');
    return `geo:search:${lang}:${digest}:${limit}`;
  }

  private buildReverseCacheKey(
    lat: number,
    lon: number,
    lang: GeoLang,
  ): string {
    return `geo:reverse:${lang}:${lat.toFixed(4)},${lon.toFixed(4)}`;
  }

  private roundCoordinates(
    lat: number,
    lon: number,
  ): { lat: number; lon: number } {
    return {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
    };
  }

  private maskCoordinatesForLogs(path: string): string {
    if (this.appEnv !== 'production' && this.appEnv !== 'staging') {
      return path;
    }

    return path
      .replace(/(lat=)-?\d+(\.\d+)?/gi, '$10.00')
      .replace(/(lon=)-?\d+(\.\d+)?/gi, '$10.00');
  }
}
