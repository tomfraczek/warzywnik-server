// src/vegetables/vegetables.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
  Query,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VegetablesService } from './vegetables.service';
import { CreateVegetableDto } from './dto/create-vegetable.dto';
import { UpdateVegetableDto } from './dto/update-vegetable.dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Controller('v1/vegetables')
export class VegetablesController {
  private readonly logger = new Logger(VegetablesController.name);

  constructor(private readonly vegetablesService: VegetablesService) {}

  @Get()
  findAll(@Query('month') month?: string) {
    if (month) {
      const m = Number(month);
      return this.vegetablesService.recommendations(m);
    }
    return this.vegetablesService.findAll();
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('Parameter "slug" is required');
    return this.vegetablesService.checkSlug(slug);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.vegetablesService.findOneBySlug(slug);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() rawBody: Record<string, any>,
  ) {
    if (file) {
      const filename = `${uuid()}-${file.originalname}`;
      const uploadsDir = path.join(__dirname, '../../uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, file.buffer);
      rawBody.media = rawBody.media || [];
      rawBody.media.push({
        type: 'image',
        url: `/uploads/${filename}`,
        title: file.originalname,
        sortOrder: 0,
      });
    }

    const dto = plainToInstance(CreateVegetableDto, rawBody);
    const errors = validateSync(dto as any, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length) throw new BadRequestException(errors);

    return this.vegetablesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateVegetableDto) {
    this.logger.log(`PATCH /vegetables/${id} BODY=${JSON.stringify(body)}`);
    return this.vegetablesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.vegetablesService.delete(id);
  }
}
