import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Soil } from './entities/soil.entity';
import { z } from 'zod';
import { createSoilSchema } from './dto/create-soil.dto';
import { updateSoilSchema } from './dto/update-soil.dto';

@Injectable()
export class SoilsService {
  constructor(
    @InjectRepository(Soil)
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Soil[]> {
    return this.em.find(Soil, {});
  }

  async findOne(id: string): Promise<Soil> {
    const soil = await this.em.findOne(Soil, { id });
    if (!soil) throw new NotFoundException('Soil not found');
    return soil;
  }

  async create(data: z.infer<typeof createSoilSchema>): Promise<Soil> {
    const soil = this.em.create(Soil, data);
    await this.em.persistAndFlush(soil);
    return soil;
  }

  async update(
    id: string,
    data: z.infer<typeof updateSoilSchema>,
  ): Promise<Soil> {
    const soil = await this.findOne(id);
    this.em.assign(soil, data);
    await this.em.flush();
    return soil;
  }

  async delete(id: string): Promise<void> {
    const soil = await this.findOne(id);
    await this.em.removeAndFlush(soil);
  }
}
