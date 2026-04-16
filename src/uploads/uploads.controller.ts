import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EntityManager } from '@mikro-orm/postgresql';
import { R2StorageService } from './r2-storage.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { VegetablesService } from '../vegetables/vegetables.service';
import { Article } from '../articles/article.entity';
import { ArticlesService } from '../articles/articles.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Controller('v1/uploads')
export class UploadsController {
  constructor(
    private readonly em: EntityManager,
    private readonly r2Storage: R2StorageService,
    private readonly vegetablesService: VegetablesService,
    private readonly articlesService: ArticlesService,
  ) {}

  @Post('vegetables/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return cb(new BadRequestException('Unsupported file type'), false);
        }
        return cb(null, true);
      },
    }),
  )
  async uploadVegetableImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const vegetable = await this.em.findOne(Vegetable, { id });
    if (!vegetable) {
      throw new NotFoundException('Vegetable not found');
    }

    const ext = mimeToExtension[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    const key = `vegetables/${id}.${ext}`;

    await this.r2Storage.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    vegetable.imageUrl = this.r2Storage.getPublicUrl(key);
    await this.em.flush();

    return this.vegetablesService.getById(id);
  }

  @Delete('vegetables/:id/image')
  @HttpCode(204)
  async deleteVegetableImage(@Param('id', new ParseUUIDPipe()) id: string) {
    const vegetable = await this.em.findOne(Vegetable, { id });
    if (!vegetable) {
      throw new NotFoundException('Vegetable not found');
    }

    const imageUrl = vegetable.imageUrl;
    if (imageUrl) {
      const key = this.extractKeyFromPublicUrl(imageUrl);
      if (!key) {
        throw new BadRequestException('Invalid image URL');
      }

      if (!key.startsWith('vegetables/')) {
        throw new BadRequestException('Invalid vegetable image key');
      }

      await this.r2Storage.deleteObject({ key });
    }

    vegetable.imageUrl = null;
    await this.em.flush();
  }

  @Post('articles/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return cb(new BadRequestException('Unsupported file type'), false);
        }
        return cb(null, true);
      },
    }),
  )
  async uploadArticleCoverAnonymous(
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const ext = mimeToExtension[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    const baseName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const key = `articles/${baseName}.${ext}`;

    await this.r2Storage.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return { url: this.r2Storage.getPublicUrl(key) };
  }

  @Post('articles/:id/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return cb(new BadRequestException('Unsupported file type'), false);
        }
        return cb(null, true);
      },
    }),
  )
  async uploadArticleCover(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const article = await this.em.findOne(Article, { id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const ext = mimeToExtension[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    const key = `articles/${id}.${ext}`;

    await this.r2Storage.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    article.coverImageUrl = this.r2Storage.getPublicUrl(key);
    await this.em.flush();

    return this.articlesService.getById(id);
  }

  @Delete('articles/:id/cover')
  @HttpCode(204)
  async deleteArticleCover(@Param('id', new ParseUUIDPipe()) id: string) {
    const article = await this.em.findOne(Article, { id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const imageUrl = article.coverImageUrl;
    if (imageUrl) {
      const key = this.extractKeyFromPublicUrl(imageUrl);
      if (!key) {
        throw new BadRequestException('Invalid cover image URL');
      }

      if (!key.startsWith('articles/')) {
        throw new BadRequestException('Invalid article image key');
      }

      await this.r2Storage.deleteObject({ key });
    }

    article.coverImageUrl = null;
    await this.em.flush();
  }

  private extractKeyFromPublicUrl(url: string): string | null {
    const baseUrl = this.r2Storage.getPublicBaseUrl();
    if (!url.startsWith(baseUrl)) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const key = parsed.pathname.replace(/^\/+/, '');
      return key.length ? key : null;
    } catch {
      return null;
    }
  }
}
