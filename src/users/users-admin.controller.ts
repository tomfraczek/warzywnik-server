import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from './user.entity';
import { UsersAdminService } from './users-admin.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  listAdminUsersQuerySchema,
  patchAdminUserSchema,
  ListAdminUsersQueryDto,
  PatchAdminUserDto,
} from './dto/admin-users.schemas';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/admin/users')
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAdminUsersQuerySchema))
    query: ListAdminUsersQueryDto,
  ) {
    return this.usersAdminService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersAdminService.getById(id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(patchAdminUserSchema)) body: PatchAdminUserDto,
  ) {
    return this.usersAdminService.update(
      id,
      body,
      this.getUserFromRequest(req).id,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.usersAdminService.delete(id, this.getUserFromRequest(req).id);
  }

  private getUserFromRequest(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }

    return req.userEntity;
  }
}
