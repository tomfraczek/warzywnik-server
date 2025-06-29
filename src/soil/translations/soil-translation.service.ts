import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';
import { SoilTranslation } from './entities/soil-translation.entity';
import { CreateSoilTranslationDto } from './dto/create-soil-translation.dto';
import { UpdateSoilTranslationDto } from './dto/update-soil-translation.dto';
import { Soil } from '../entities/soil.entity';

@Injectable()
export class SoilTranslationService {
  constructor(
    @InjectRepository(SoilTranslation)
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<SoilTranslation[]> {
    return this.em.find(SoilTranslation, {}, { populate: ['soil'] });
  }

  async findOne(id: string): Promise<SoilTranslation> {
    const item = await this.em.findOne(
      SoilTranslation,
      { id },
      { populate: ['soil'] },
    );
    if (!item) throw new NotFoundException('Translation not found');
    return item;
  }

  async create(data: CreateSoilTranslationDto): Promise<SoilTranslation> {
    const soil = await this.em.findOne(Soil, { id: data.soilId });
    if (!soil) throw new NotFoundException('Soil not found');

    const translation = this.em.create(SoilTranslation, {
      ...data,
      soil,
    });

    await this.em.persistAndFlush(translation);
    return translation;
  }

  async update(
    id: string,
    data: UpdateSoilTranslationDto,
  ): Promise<SoilTranslation> {
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
