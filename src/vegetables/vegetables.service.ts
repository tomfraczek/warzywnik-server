import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Vegetable } from './entities/vegetable.entity';
import { createVegetableSchema } from './dto/create-vegetable.dto';
import { updateVegetableSchema } from './dto/update-vegetable.dto';
import { z } from 'zod';
import { Soil } from '../soil/entities/soil.entity';

@Injectable()
export class VegetablesService {
  constructor(
    @InjectRepository(Vegetable)
    private readonly vegetableRepo: EntityRepository<Vegetable>,
    @InjectRepository(Soil)
    private readonly soilRepo: EntityRepository<Soil>,
    private readonly em: EntityManager,
  ) {}

  async findAll(lang?: string): Promise<Vegetable[]> {
    const populate: any[] = [];

    if (lang) {
      populate.push({ field: 'translations', where: { lang } });
    } else {
      populate.push('translations');
    }

    populate.push('companionRules');

    return this.vegetableRepo.find({}, { populate });
  }

  async findOne(id: string, lang?: string): Promise<Vegetable> {
    const populate: any[] = [];

    if (lang) {
      populate.push({ field: 'translations', where: { lang } });
    } else {
      populate.push('translations');
    }

    populate.push('companionRules');

    const vegetable = await this.vegetableRepo.findOne({ id }, { populate });

    if (!vegetable) throw new NotFoundException('Vegetable not found');
    return vegetable;
  }

  async create(
    data: z.infer<typeof createVegetableSchema>,
  ): Promise<Vegetable> {
    let soil: Soil | null = null;

    if (data.soilType) {
      soil = await this.soilRepo.findOne({ id: data.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    const vegetable = this.vegetableRepo.create({
      ...data,
      soilType: soil,
    });

    await this.em.persistAndFlush(vegetable); // 👈 tutaj EntityManager
    return vegetable;
  }

  async update(
    id: string,
    data: z.infer<typeof updateVegetableSchema>,
  ): Promise<Vegetable> {
    const vegetable = await this.findOne(id);

    let soil: Soil | null = null;
    if (data.soilType) {
      soil = await this.soilRepo.findOne({ id: data.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    this.vegetableRepo.assign(vegetable, {
      ...data,
      soilType: soil ?? undefined,
    });

    await this.em.flush(); // 👈 tutaj również EntityManager
    return vegetable;
  }

  async delete(id: string): Promise<void> {
    const vegetable = await this.findOne(id);
    await this.em.removeAndFlush(vegetable); // 👈 EntityManager
  }

  async checkSlug(slug: string): Promise<{ available: boolean }> {
    const count = await this.soilRepo.count({ slug });
    return { available: count === 0 };
  }
}
