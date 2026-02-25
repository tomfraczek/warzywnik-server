import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

type RequestWithIdentity = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  userEntity?: {
    id: string;
  };
};

@Injectable()
export class GeoThrottleGuard implements CanActivate {
  private readonly requestsPerMinute: number;
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor() {
    this.requestsPerMinute = Number(process.env.GEO_RATE_LIMIT_PER_MIN ?? 30);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithIdentity>();
    const identity = req.userEntity?.id ?? this.resolveClientIp(req);
    const key = `geo:${identity}`;

    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAtMs <= now) {
      this.buckets.set(key, { count: 1, resetAtMs: now + 60_000 });
      return true;
    }

    if (existing.count >= this.requestsPerMinute) {
      throw new HttpException(
        'Geo rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    this.buckets.set(key, existing);
    return true;
  }

  private resolveClientIp(req: RequestWithIdentity): string {
    const xff = req.headers['x-forwarded-for'];

    if (typeof xff === 'string') {
      const first = xff.split(',')[0]?.trim();
      if (first) {
        return first;
      }
    }

    if (Array.isArray(xff) && xff.length > 0) {
      return xff[0] as string;
    }

    return req.ip ?? 'unknown';
  }
}
