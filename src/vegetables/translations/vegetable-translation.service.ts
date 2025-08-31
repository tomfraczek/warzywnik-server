import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { VegetableTranslation } from '../entities/vegetable-translation.entity';
import { Vegetable } from '../entities/vegetable.entity';

import { createVegetableTranslationSchema } from './dto/create-translation.dto';
import { updateVegetableTranslationSchema } from './dto/update-translation.dto';

@Injectable()
export class VegetableTranslationService {
  constructor(
    @InjectRepository(VegetableTranslation)
    private readonly translationRepo: EntityRepository<VegetableTranslation>,
    @InjectRepository(Vegetable)
    private readonly vegetableRepo: EntityRepository<Vegetable>,
    private readonly em: EntityManager,
  ) {}

  async findOne(id: string): Promise<VegetableTranslation> {
    const translation = await this.translationRepo.findOne({ id });
    if (!translation) throw new NotFoundException('Translation not found');
    return translation;
  }

  async create(raw: unknown): Promise<VegetableTranslation> {
    const data = createVegetableTranslationSchema.parse(raw);

    const { vegetableId, ...rest } = data; // <- tu vegetableId faktycznie użyte
    const vegetable = await this.vegetableRepo.findOne({ id: vegetableId });
    if (!vegetable) throw new NotFoundException('Vegetable not found');

    const translation = this.translationRepo.create({
      ...rest, // lang, name, description, sekcje opisowe
      vegetable, // relacja
    });

    await this.em.persistAndFlush(translation);
    return translation;
  }

  async update(id: string, raw: unknown): Promise<VegetableTranslation> {
    const data = updateVegetableTranslationSchema.parse(raw);
    const translation = await this.findOne(id);

    this.translationRepo.assign(translation, data);
    await this.em.flush();
    return translation;
  }

  async delete(id: string): Promise<void> {
    const translation = await this.findOne(id);
    await this.em.removeAndFlush(translation);
  }
}
