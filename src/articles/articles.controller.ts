import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import {
  createArticleSchema,
  deleteArticlesBulkSchema,
  listArticlesQuerySchema,
  updateArticleSchema,
  CreateArticleDto,
  DeleteArticlesBulkDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listArticlesQuerySchema))
    query: ListArticlesQueryDto,
  ) {
    return this.articlesService.listPublic(query);
  }

  @Get('slug/:slug')
  getBySlug(@Req() req: RequestWithUser, @Param('slug') slug: string) {
    return this.articlesService.getPublicBySlug(slug, req.userEntity ?? null);
  }

  @Get(':idOrSlug')
  get(@Req() req: RequestWithUser, @Param('idOrSlug') idOrSlug: string) {
    return this.articlesService.getPublicByIdOrSlug(
      idOrSlug,
      req.userEntity ?? null,
    );
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createArticleSchema))
    body: CreateArticleDto,
  ) {
    return this.articlesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateArticleSchema))
    body: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, body);
  }

  @Delete()
  @HttpCode(204)
  async removeBulk(
    @Body(new ZodValidationPipe(deleteArticlesBulkSchema))
    body: DeleteArticlesBulkDto,
  ) {
    await this.articlesService.removeMany(body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.articlesService.remove(id);
  }
}
