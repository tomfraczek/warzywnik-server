import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the Clerk subject (from the verified token) into controller handlers.
 */
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ auth?: { sub?: string } }>();
    return req.auth?.sub as string;
  },
);
