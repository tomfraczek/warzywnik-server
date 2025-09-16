import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { UpdateUserSettingsDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Variant A: GET /users/me performs find-or-create by Clerk user id.
   */
  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async me(@AuthUser() clerkUserId: string) {
    return this.userService.getOrCreateMeByClerkId(clerkUserId);
  }

  /**
   * Update non-PII settings for the current user.
   */
  @UseGuards(ClerkAuthGuard)
  @Patch('me/settings')
  async updateSettings(
    @AuthUser() clerkUserId: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.userService.updateSettings(clerkUserId, dto);
  }
}
