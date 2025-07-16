import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityManager,
  EntityRepository,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Soil } from './entities/soil.entity';
import { z } from 'zod';
import { createSoilSchema } from './dto/create-soil.dto';
import { updateSoilSchema } from './dto/update-soil.dto';

@Injectable()
export class SoilsService {
  constructor(
    @InjectRepository(Soil)
    private readonly soilRepo: EntityRepository<Soil>,

    private readonly em: EntityManager,
  ) {}

  async findAll(lang?: string): Promise<Soil[]> {
    const populate: any[] = [];

    if (lang) {
      populate.push({ field: 'translations', where: { lang } });
    } else {
      populate.push('translations');
    }

    return this.soilRepo.find({}, { populate });
  }

  async findOne(id: string, lang?: string): Promise<Soil> {
    const populate: any[] = [];

    if (lang) {
      populate.push({ field: 'translations', where: { lang } });
    } else {
      populate.push('translations');
    }

    const soil = await this.soilRepo.findOne({ id }, { populate });

    if (!soil) throw new NotFoundException('Soil not found');
    return soil;
  }

  async create(data: z.infer<typeof createSoilSchema>): Promise<Soil> {
    const soil = this.soilRepo.create(data);

    try {
      await this.em.persistAndFlush(soil);
      return soil;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new BadRequestException('Slug must be unique');
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: z.infer<typeof updateSoilSchema>,
  ): Promise<Soil> {
    const soil = await this.findOne(id);
    this.soilRepo.assign(soil, data);
    await this.em.flush();
    return soil;
  }

  async delete(id: string): Promise<void> {
    const soil = await this.soilRepo.findOne(
      { id },
      { populate: ['translations'] },
    );

    if (!soil) {
      throw new NotFoundException('Soil not found');
    }

    // Remove all related translations first
    for (const translation of soil.translations) {
      this.em.remove(translation);
    }

    // Then remove the soil itself
    this.em.remove(soil);
    await this.em.flush();
  }

  async checkSlug(slug: string): Promise<{ available: boolean }> {
    const count = await this.soilRepo.count({ slug });
    return { available: count === 0 };
  }
}
