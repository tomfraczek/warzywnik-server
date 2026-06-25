import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RevenueCatService,
  RevenueCatWebhookPayload,
} from './revenuecat.service';
import { EntitlementsResult } from '../entitlements/entitlements.service';
import { Public } from '../auth/public.decorator';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

type MockEventBody = {
  type?: string;
  userId: string;
  expirationDays?: number;
};

const SUPPORTED_MOCK_TYPES = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'CANCELLATION',
  'BILLING_ISSUE',
  'EXPIRATION',
] as const;

@Controller('v1/revenuecat')
export class RevenueCatController {
  constructor(private readonly revenueCatService: RevenueCatService) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async webhook(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
  ): Promise<{ ok: boolean }> {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      throw new UnauthorizedException(
        'Invalid or missing RevenueCat webhook secret',
      );
    }

    if (!body || typeof body !== 'object' || !('event' in body)) {
      throw new BadRequestException('Invalid RevenueCat webhook payload');
    }

    const payload = body as RevenueCatWebhookPayload;

    if (
      !payload.event ||
      typeof payload.event.type !== 'string' ||
      typeof payload.event.app_user_id !== 'string'
    ) {
      throw new BadRequestException('Invalid RevenueCat event structure');
    }

    await this.revenueCatService.processWebhook(payload);

    return { ok: true };
  }

  @Post('sync')
  @HttpCode(200)
  async sync(@Req() req: RequestWithUser): Promise<EntitlementsResult> {
    const user = this.getUserFromRequest(req);
    return this.revenueCatService.syncSubscription(user.id);
  }

  /**
   * Dev-only: simulate a RevenueCat event without a real Google Play purchase.
   * Returns 404 in non-development environments.
   */
  @Post('mock-event')
  @Public()
  @HttpCode(200)
  async mockEvent(
    @Body() body: MockEventBody,
  ): Promise<{ ok: boolean; eventType: string; userId: string }> {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }

    const { userId, type = 'INITIAL_PURCHASE', expirationDays = 30 } = body;

    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('userId is required');
    }

    if (!SUPPORTED_MOCK_TYPES.includes(type as (typeof SUPPORTED_MOCK_TYPES)[number])) {
      throw new BadRequestException(
        `Unsupported event type. Supported: ${SUPPORTED_MOCK_TYPES.join(', ')}`,
      );
    }

    const payload = this.revenueCatService.buildMockPayload(
      type,
      userId,
      expirationDays,
    );

    await this.revenueCatService.processWebhook(payload);

    return { ok: true, eventType: type, userId };
  }

  private getUserFromRequest(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }
    return req.userEntity;
  }
}
