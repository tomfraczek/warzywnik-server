import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Vegetable } from './entities/vegetable.entity';
import { CreateVegetableDto } from './dto/create-vegetable.dto';
import { UpdateVegetableDto } from './dto/update-vegetable.dto';
import { Soil } from '../soil/entities/soil.entity';
import { CompanionRule } from '../companion-rules/entities/companion-rule.entity';
import { VegetableMedia } from './entities/vegetable-media.entity';
import { VegetableWindow } from './entities/vegetable-window.entity';
import {
  CompanionRelation,
  MediaType,
  WindowType,
} from '../common/enums/vegetable.enums';

type CompanionSummary = { id: string; slug: string; name: string };
type CompanionBuckets = {
  good: CompanionSummary[];
  bad: CompanionSummary[];
  allelopathic: CompanionSummary[];
};

type VegetableMediaInput = {
  type: MediaType;
  url: string;
  title?: string;
  sortOrder?: number;
};

type VegetableWindowInput = {
  type: WindowType;
  startMonth: number;
  endMonth: number;
};

type CreateVegetableInput = CreateVegetableDto & {
  soilType?: string;
  media?: VegetableMediaInput[];
  calendarWindows?: VegetableWindowInput[];
};

type UpdateVegetableInput = UpdateVegetableDto & {
  soilType?: string;
  media?: VegetableMediaInput[];
  calendarWindows?: VegetableWindowInput[];
};

@Injectable()
export class VegetablesService {
  constructor(
    @InjectRepository(Vegetable)
    private readonly vegetableRepo: EntityRepository<Vegetable>,
    @InjectRepository(Soil)
    private readonly soilRepo: EntityRepository<Soil>,
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Vegetable[]> {
    return this.vegetableRepo.findAll({
      populate: ['calendarWindows', 'media'],
    });
  }

  async findOneBySlug(slug: string): Promise<any> {
    const vegetable = await this.vegetableRepo.findOne(
      { slug },
      { populate: ['calendarWindows', 'media', 'translations'] },
    );
    if (!vegetable) throw new NotFoundException('Vegetable not found');

    // companions grouped by relation
    const companionRules = await this.em.find(
      CompanionRule,
      { source: vegetable },
      { populate: ['target'] },
    );
    const companions: CompanionBuckets = {
      good: [],
      bad: [],
      allelopathic: [],
    };
    for (const r of companionRules) {
      const target = r.target as Vegetable;
      const minimal = { id: target.id, slug: target.slug, name: target.name };
      if (r.relation === CompanionRelation.GOOD) companions.good.push(minimal);
      if (r.relation === CompanionRelation.BAD) companions.bad.push(minimal);
      if (r.relation === CompanionRelation.ALLELOPATHIC)
        companions.allelopathic.push(minimal);
    }

    // media grouped
    const images = vegetable.media
      .getItems()
      .filter((m: VegetableMedia) => m.type === MediaType.IMAGE)
      .map((m: VegetableMedia) => ({
        url: m.url,
        title: m.title,
        sortOrder: m.sortOrder,
      }));
    const videos = vegetable.media
      .getItems()
      .filter((m: VegetableMedia) => m.type === MediaType.VIDEO)
      .map((m: VegetableMedia) => ({
        url: m.url,
        title: m.title,
        sortOrder: m.sortOrder,
      }));
    const illustrations = vegetable.media
      .getItems()
      .filter((m: VegetableMedia) => m.type === MediaType.ILLUSTRATION)
      .map((m: VegetableMedia) => ({
        url: m.url,
        title: m.title,
        sortOrder: m.sortOrder,
      }));

    return {
      id: vegetable.id,
      slug: vegetable.slug,
      name: vegetable.name,
      createdAt: vegetable.createdAt,
      updatedAt: vegetable.updatedAt,
      latinName: vegetable.latinName,
      family: vegetable.family,
      plantType: vegetable.plantType,
      growthForm: vegetable.growthForm,
      lifeCycle: vegetable.lifeCycle,
      daysToHarvest: vegetable.daysToHarvest,
      growingSeasonLength: vegetable.growingSeasonLength,
      environment: {
        minTemp: vegetable.minTemp,
        optimalTemp: vegetable.optimalTemp,
        frostResistance: vegetable.frostResistance,
        sunExposure: vegetable.sunExposure,
        soilType: vegetable.soilType
          ? {
              id: vegetable.soilType.id,
              name: vegetable.soilType.name,
            }
          : undefined,
        soilPHMin: vegetable.soilPHMin,
        soilPHMax: vegetable.soilPHMax,
        waterNeeds: vegetable.waterNeeds,
        nutrientNeeds: vegetable.nutrientNeeds,
      },
      sowing: {
        seedDepth: vegetable.seedDepth,
        rowSpacing: vegetable.rowSpacing,
        plantSpacing: vegetable.plantSpacing,
        germinationTimeDays: vegetable.germinationTimeDays,
        germinationTempMin: vegetable.germinationTempMin,
        directSow: vegetable.directSow,
        thinningRequired: vegetable.thinningRequired,
      },
      care: {
        wateringFrequencyDays: vegetable.wateringFrequencyDays,
        fertilizingSchedule: vegetable.fertilizingSchedule,
        mulchingRecommended: vegetable.mulchingRecommended,
        stakingRequired: vegetable.stakingRequired,
        pruningRequired: vegetable.pruningRequired,
      },
      pests: {
        commonPests: vegetable.commonPests || [],
        commonDiseases: vegetable.commonDiseases || [],
        organicTreatments: vegetable.organicTreatments || [],
        chemicalTreatments: vegetable.chemicalTreatments || [],
      },
      rotation: {
        rotationGroup: vegetable.rotationGroup,
        rules: {
          // fetch from RotationFamilyRule where fromFamily === vegetable.family
          goodAfter: [],
          notAfter: [],
        },
      },
      yield: {
        yieldPerM2: vegetable.yieldPerM2,
        harvestFrequency: vegetable.harvestFrequency,
        storageLife: vegetable.storageLife,
        storageConditions: vegetable.storageConditions || [],
      },
      nutrition: {
        caloriesPer100g: vegetable.caloriesPer100g,
        macros: vegetable.macros || null,
        vitamins: vegetable.vitamins || [],
        minerals: vegetable.minerals || [],
      },
      education: {
        description: vegetable.description,
        howToGrow: vegetable.howToGrow,
        commonMistakes: vegetable.commonMistakes,
        tips: vegetable.tips,
        faq: vegetable.faq,
        blogPosts: vegetable.blogPosts || [],
      },
      metadata: {
        difficultyLevel: vegetable.difficultyLevel,
        spaceEfficiency: vegetable.spaceEfficiency,
        ecoScore: vegetable.ecoScore,
        beeFriendly: vegetable.beeFriendly,
      },
      calendarWindows: vegetable.calendarWindows
        .getItems()
        .map((w: VegetableWindow) => ({
          type: w.type,
          startMonth: w.startMonth,
          endMonth: w.endMonth,
        })),
      companions,
      media: { images, videos, illustrations },
    };
  }

  async create(data: CreateVegetableDto): Promise<any> {
    const input = data as CreateVegetableInput;
    let soil: Soil | null = null;
    if (input.soilType) {
      soil = await this.soilRepo.findOne({ id: input.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    const vegetable = this.vegetableRepo.create({
      ...data,
      soilType: soil ?? undefined,
    });

    // handle media and windows if provided
    if (input.media && Array.isArray(input.media)) {
      for (const m of input.media) {
        const mm = new VegetableMedia();
        mm.type = m.type;
        mm.url = m.url;
        mm.title = m.title;
        mm.sortOrder = m.sortOrder;
        mm.vegetable = vegetable;
        this.em.persist(mm);
      }
    }

    if (input.calendarWindows && Array.isArray(input.calendarWindows)) {
      for (const w of input.calendarWindows) {
        const ww = new VegetableWindow();
        ww.type = w.type;
        ww.startMonth = w.startMonth;
        ww.endMonth = w.endMonth;
        ww.vegetable = vegetable;
        this.em.persist(ww);
      }
    }

    await this.em.persistAndFlush(vegetable);
    return this.findOneBySlug(vegetable.slug);
  }

  async update(id: string, data: UpdateVegetableDto): Promise<any> {
    const vegetable = await this.vegetableRepo.findOne({ id });
    if (!vegetable) throw new NotFoundException('Vegetable not found');

    const input = data as UpdateVegetableInput;
    let soil: Soil | null = null;
    if (input.soilType) {
      soil = await this.soilRepo.findOne({ id: input.soilType });
      if (!soil) throw new NotFoundException('Soil not found');
    }

    this.vegetableRepo.assign(vegetable, {
      ...data,
      soilType: soil ?? undefined,
    });
    await this.em.flush();
    return this.findOneBySlug(vegetable.slug);
  }

  async delete(id: string): Promise<void> {
    const vegetable = await this.vegetableRepo.findOne({ id });
    if (!vegetable) throw new NotFoundException('Vegetable not found');
    await this.em.removeAndFlush(vegetable);
  }

  async checkSlug(slug: string): Promise<{ available: boolean }> {
    // 👇 poprawka — sprawdzamy w tabeli warzyw, nie gleb
    const count = await this.vegetableRepo.count({ slug });
    return { available: count === 0 };
  }

  async recommendations(month: number) {
    if (!month || month < 1 || month > 12) return [];
    const windows = await this.em.find(
      VegetableWindow,
      {
        startMonth: { $lte: month },
        endMonth: { $gte: month },
        type: WindowType.SOWING,
      },
      { populate: ['vegetable'] },
    );
    return windows.map((w) => ({
      id: w.vegetable.id,
      slug: w.vegetable.slug,
      name: w.vegetable.name,
    }));
  }
}
