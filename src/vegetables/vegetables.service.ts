import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Vegetable } from './entities/vegetable.entity';
import { z } from 'zod';
import { createVegetableSchema } from './dto/create-vegetable.dto';
import { updateVegetableSchema } from './dto/update-vegetable.dto';
import { Soil } from '../soil/entities/soil.entity';

@Injectable()
export class VegetablesService {
  constructor(
    @InjectRepository(Vegetable)
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Vegetable[]> {
    return this.em.find(
      Vegetable,
      {},
      {
        populate: ['translations', 'companionRules'],
      },
    );
  }

  async findOne(id: string): Promise<Vegetable> {
    const vegetable = await this.em.findOne(
      Vegetable,
      { id },
      { populate: ['translations', 'companionRules'] },
    );
    if (!vegetable) throw new NotFoundException('Vegetable not found');
    return vegetable;
  }

  async create(
    data: z.infer<typeof createVegetableSchema>,
  ): Promise<Vegetable> {
    let soil: Soil | null = null;
    if (data.soilType) {
      soil = await this.em.findOne(Soil, { id: data.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    const vegetable = this.em.create(Vegetable, {
      ...data,
      soilType: soil,
    });

    await this.em.persistAndFlush(vegetable);
    return vegetable;
  }

  async update(
    id: string,
    data: z.infer<typeof updateVegetableSchema>,
  ): Promise<Vegetable> {
    const vegetable = await this.findOne(id);

    let soil: Soil | null = null;
    if (data.soilType) {
      soil = await this.em.findOne(Soil, { id: data.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    this.em.assign(vegetable, {
      ...data,
      soilType: soil ?? undefined,
    });

    await this.em.flush();
    return vegetable;
  }

  async delete(id: string): Promise<void> {
    const vegetable = await this.findOne(id);
    await this.em.removeAndFlush(vegetable);
  }
}
