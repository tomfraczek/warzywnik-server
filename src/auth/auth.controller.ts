import { Controller, Get } from '@nestjs/common';
import { AuthUser } from './auth-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('whoami')
  whoami(@AuthUser() sub: string) {
    return { sub };
  }
}
