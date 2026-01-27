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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EntityManager } from '@mikro-orm/postgresql';
import { AdminTokenGuard } from '../auth/admin-token.guard';
import { R2StorageService } from './r2-storage.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { VegetablesService } from '../vegetables/vegetables.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Controller('v1/uploads')
@UseGuards(AdminTokenGuard)
export class UploadsController {
  constructor(
    private readonly em: EntityManager,
    private readonly r2Storage: R2StorageService,
    private readonly vegetablesService: VegetablesService,
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
      const baseUrl = this.r2Storage.getPublicBaseUrl();
      if (imageUrl.startsWith(baseUrl)) {
        try {
          const parsed = new URL(imageUrl);
          const key = parsed.pathname.replace(/^\/+/, '');
          if (key) {
            await this.r2Storage.deleteObject({ key });
          }
        } catch {
          // ignore invalid URL
        }
      }
    }

    vegetable.imageUrl = null;
    await this.em.flush();
  }
}
