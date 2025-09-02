// src/vegetables/vegetables.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Put,
  Delete,
  Query,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { VegetablesService } from './vegetables.service';
import { createVegetableSchema } from './dto/create-vegetable.dto';
import { updateVegetableSchema } from './dto/update-vegetable.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Controller('vegetables')
export class VegetablesController {
  private readonly logger = new Logger(VegetablesController.name);

  constructor(private readonly vegetablesService: VegetablesService) {}

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.vegetablesService.findAll(lang);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Parameter "slug" is required');
    }
    return this.vegetablesService.checkSlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.vegetablesService.findOne(id, lang);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() rawBody: Record<string, string>,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const filename = `${uuid()}-${file.originalname}`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, file.buffer);

    const imageUrl = `/uploads/${filename}`;

    const data = createVegetableSchema.parse({
      ...rawBody,
      image: imageUrl,

      // liczby (te musimy przerobić, bo przyszły jako stringi z FormData)
      germinationDays: Number(rawBody.germinationDays),
      sowingDepthCm: Number(rawBody.sowingDepthCm),
      rowSpacingCm: Number(rawBody.rowSpacingCm),
      plantSpacingCm: Number(rawBody.plantSpacingCm),

      // te dwa booleany z create (nie są w schemacie koercjonowane):
      isDirectSow: rawBody.isDirectSow === 'true',
      isPerennial: rawBody.isPerennial === 'true',

      // feedingClass, mulchingRecommended, careTips – zostaw jak są,
      // Zod zrobi koercję/validację:
      // feedingClass: rawBody.feedingClass,
      // mulchingRecommended: rawBody.mulchingRecommended,
      // careTips: rawBody.careTips,

      soilType: rawBody.soilType || undefined,
    });

    return this.vegetablesService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: z.infer<typeof updateVegetableSchema>,
  ) {
    this.logger.log(`PUT /vegetables/${id} BODY=${JSON.stringify(body)}`);
    const data = updateVegetableSchema.parse(body);
    return this.vegetablesService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.vegetablesService.delete(id);
  }
}
