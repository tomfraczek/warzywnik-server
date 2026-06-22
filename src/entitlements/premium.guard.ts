import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from './entitlements.service';
import { PREMIUM_FEATURE_KEY } from './require-premium.decorator';
import { User } from '../users/user.entity';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      PREMIUM_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ userEntity?: User }>();
    const user = req.userEntity;

    if (!user || !this.entitlementsService.isPremium(user)) {
      throw new HttpException(
        {
          code: 'PREMIUM_REQUIRED',
          message: 'This feature requires Premium.',
          details: { reason: 'FEATURE_LOCKED', feature },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
