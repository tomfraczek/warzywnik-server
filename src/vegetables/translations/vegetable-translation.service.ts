// src/vegetables/translation/vegetable-translation.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { VegetableTranslation } from '../entities/vegetable-translation.entity';
import { z } from 'zod';
import { createVegetableTranslationSchema } from './dto/create-translation.dto';
import { Vegetable } from '../entities/vegetable.entity';
import { updateVegetableTranslationSchema } from './dto/update-translation.dto';

@Injectable()
export class VegetableTranslationService {
  constructor(private readonly em: EntityManager) {}

  async findOne(id: string): Promise<VegetableTranslation> {
    const translation = await this.em.findOne(VegetableTranslation, { id });
    if (!translation) throw new NotFoundException('Translation not found');
    return translation;
  }

  async create(
    data: z.infer<typeof createVegetableTranslationSchema>,
  ): Promise<VegetableTranslation> {
    const vegetable = await this.em.findOne(Vegetable, {
      id: data.vegetableId,
    });
    if (!vegetable) throw new NotFoundException('Vegetable not found');

    const translation = this.em.create(VegetableTranslation, {
      lang: data.lang,
      name: data.name,
      description: data.description,
      vegetable,
    });

    await this.em.persistAndFlush(translation);
    return translation;
  }

  async update(
    id: string,
    data: z.infer<typeof updateVegetableTranslationSchema>,
  ): Promise<VegetableTranslation> {
    const translation = await this.findOne(id);
    this.em.assign(translation, data);
    await this.em.flush();
    return translation;
  }

  async delete(id: string): Promise<void> {
    const translation = await this.findOne(id);
    await this.em.removeAndFlush(translation);
  }
}
