import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { User } from '../users/user.entity';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  AddFavoriteDto,
  addFavoriteSchema,
  ListFavoritesQueryDto,
  listFavoritesQuerySchema,
  ListGroupedFavoritesQueryDto,
  listGroupedFavoritesQuerySchema,
} from './dto/favorite.schemas';
import { FavoriteTargetType } from '../common/enums/favorite.enums';
import { ApiQuery } from '@nestjs/swagger';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/users/me/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  add(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(addFavoriteSchema)) body: AddFavoriteDto,
  ) {
    return this.favoritesService.add(this.getUser(req), body);
  }

  @Delete(':targetType/:targetSlug')
  @HttpCode(204)
  async remove(
    @Req() req: RequestWithUser,
    @Param('targetType', new ParseEnumPipe(FavoriteTargetType))
    targetType: FavoriteTargetType,
    @Param('targetSlug') targetSlug: string,
  ) {
    await this.favoritesService.remove(
      this.getUser(req),
      targetType,
      targetSlug,
    );
  }

  @Get()
  @ApiQuery({
    name: 'include',
    required: false,
    enum: ['details'],
    description: 'Set to details to include name and imageUrl in favorites items',
  })
  list(
    @Req() req: RequestWithUser,
    @Query(new ZodValidationPipe(listFavoritesQuerySchema))
    query: ListFavoritesQueryDto,
  ) {
    return this.favoritesService.list(this.getUser(req), query);
  }

  @Get('grouped')
  @ApiQuery({
    name: 'include',
    required: false,
    enum: ['details'],
    description: 'Set to details to include name and imageUrl in favorites items',
  })
  listGrouped(
    @Req() req: RequestWithUser,
    @Query(new ZodValidationPipe(listGroupedFavoritesQuerySchema))
    query: ListGroupedFavoritesQueryDto,
  ) {
    return this.favoritesService.listGrouped(this.getUser(req), query);
  }

  private getUser(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }

    return req.userEntity;
  }
}
