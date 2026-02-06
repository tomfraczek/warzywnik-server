import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { UsersService } from '../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  private parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};
    return cookieHeader
      .split(';')
      .reduce<Record<string, string>>((acc, part) => {
        const [rawKey, ...rest] = part.trim().split('=');
        if (!rawKey) return acc;
        acc[rawKey] = decodeURIComponent(rest.join('=') || '');
        return acc;
      }, {});
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      auth?: { sub: string; sid?: string; azp?: string; iss?: string };
      userEntity?: unknown;
    }>();

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

    const cookies = this.parseCookies(req.headers['cookie']);
    const token = bearerToken || cookies['__session'];

    if (!token) {
      throw new UnauthorizedException('Missing Clerk token');
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      // to jest błąd konfiguracji środowiska, a nie "invalid token"
      throw new UnauthorizedException('Missing CLERK_SECRET_KEY in env');
    }

    const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES
      ? process.env.CLERK_AUTHORIZED_PARTIES.split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;

    // Uwaga: PEM w .env często ma "\n" zamiast prawdziwych newline.
    const jwtKey = process.env.CLERK_JWT_KEY
      ? process.env.CLERK_JWT_KEY.replace(/\\n/g, '\n')
      : undefined;

    try {
      const payload = await verifyToken(token, {
        secretKey,
        jwtKey,
        authorizedParties,
      });

      req.auth = {
        sub: payload.sub,
        sid: payload.sid,
        azp: payload.azp,
        iss: payload.iss,
      };

      const email = (payload as { email?: string }).email;
      const displayName = (payload as { name?: string }).name;

      const user = await this.usersService.getOrCreateFromClerkSub({
        clerkUserId: payload.sub,
        email: email ?? null,
        displayName: displayName ?? null,
      });

      req.userEntity = user;

      return true;
    } catch (err: unknown) {
      console.error('Clerk verifyToken error:', toErrorMessage(err));
      throw new UnauthorizedException(toErrorMessage(err));
    }
  }
}
