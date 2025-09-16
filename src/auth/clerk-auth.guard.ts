import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

/**
 * Guard that verifies Clerk JWT from the Authorization: Bearer <token> header.
 * On success, attaches { auth: { userId: clerkUserId } } to the request.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      auth?: { userId: string };
    }>();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY as string,
      });
      // Clerk places the user identifier in the `sub` claim
      (req as { auth?: { userId?: string } }).auth = {
        userId: payload.sub,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
