import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the Clerk userId (from the verified token) into controller handlers.
 */
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ auth?: { userId?: string } }>();
    return req.auth?.userId as string;
  },
);
