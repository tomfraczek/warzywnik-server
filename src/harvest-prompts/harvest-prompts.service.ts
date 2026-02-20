import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { User } from '../users/user.entity';
import { HarvestPromptState } from './harvest-prompt-state.entity';
import { PlantingStatus } from '../common/enums/planting.enums';
import { Month } from '../common/enums/vegetable.enums';
import { HarvestPromptAnswer } from '../common/enums/harvest-prompt.enums';
import { HarvestConfirmationDto } from './dto/harvest-prompt.schemas';
import { ActionAutomationService } from '../action-tasks/action-automation.service';

@Injectable()
export class HarvestPromptsService {
  constructor(
    private readonly em: EntityManager,
    private readonly actionAutomationService: ActionAutomationService,
  ) {}

  async listForBed(user: User, bedId: string) {
    const bed = await this.em.findOne(Bed, { id: bedId, user: user.id });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const plantings = await this.em.find(
      Planting,
      {
        user: user.id,
        bed: bed.id,
        status: {
          $nin: [PlantingStatus.CANCELLED, PlantingStatus.FINISHED],
        },
      },
      {
        populate: ['vegetable'],
        orderBy: { plannedStartDate: 'asc' },
      },
    );

    if (plantings.length === 0) {
      return { items: [] };
    }

    const states = await this.em.find(HarvestPromptState, {
      user: user.id,
      planting: { $in: plantings.map((item) => item.id) },
    });

    const statesByPlantingId = new Map(
      states.map((state) => [state.planting.id, state]),
    );

    const today = this.getTodayInWarsaw();

    const items = plantings
      .filter((planting) => {
        const state = statesByPlantingId.get(planting.id);

        if (!this.isReadyForHarvest(planting)) return false;
        if (planting.harvestedAt) return false;
        if (state?.confirmedHarvestAt) return false;

        return !state?.lastPromptedOn || state.lastPromptedOn < today;
      })
      .map((planting) => ({
        plantingId: planting.id,
        bedId: planting.bed.id,
        vegetable: planting.vegetable
          ? {
              id: planting.vegetable.id,
              name: planting.vegetable.name,
              slug: planting.vegetable.slug,
            }
          : null,
        title: planting.vegetable
          ? `Uprawa: ${planting.vegetable.name} — gotowa do zbioru`
          : 'Uprawa gotowa do zbioru',
        reason: 'HARVEST_WINDOW' as const,
      }));

    return { items };
  }

  async confirmHarvest(
    user: User,
    plantingId: string,
    dto: HarvestConfirmationDto,
  ) {
    return this.em.transactional(async (em) => {
      const planting = await em.findOne(
        Planting,
        { id: plantingId, user: user.id },
        { populate: ['bed', 'vegetable'] },
      );

      if (!planting) {
        throw new NotFoundException('Planting not found');
      }

      if (!this.isReadyForHarvest(planting)) {
        throw new BadRequestException('Planting is not ready for harvest yet');
      }

      let state = await em.findOne(HarvestPromptState, {
        user: user.id,
        planting: planting.id,
      });

      if (!state) {
        state = new HarvestPromptState();
        state.user = user;
        state.planting = planting;
      }

      state.lastPromptedOn = this.getTodayInWarsaw();
      state.lastAnswer = dto.answer;

      if (dto.answer === HarvestPromptAnswer.NO) {
        await em.persistAndFlush(state);
        return null;
      }

      const now = new Date();
      state.confirmedHarvestAt = now;
      planting.harvestedAt = now;
      planting.status = PlantingStatus.FINISHED;

      const postHarvestActions =
        await this.actionAutomationService.getPostHarvestActionSuggestions(
          planting.vegetable.id,
        );

      await em.persistAndFlush([state, planting]);

      return {
        plantingId: planting.id,
        bedId: planting.bed.id,
        postHarvestActions,
      };
    });
  }

  private isReadyForHarvest(planting: Planting) {
    if (
      planting.status === PlantingStatus.CANCELLED ||
      planting.status === PlantingStatus.FINISHED
    ) {
      return false;
    }

    const now = new Date();
    const baseDate =
      planting.actualStartDate ??
      planting.plannedStartDate ??
      planting.createdAt;

    if (planting.vegetable.timeToHarvestDaysMin != null) {
      const readyAt = this.addDays(
        baseDate,
        planting.vegetable.timeToHarvestDaysMin,
      );
      return now >= readyAt;
    }

    if (planting.vegetable.timeToHarvestDaysMax != null) {
      const readyAt = this.addDays(
        baseDate,
        planting.vegetable.timeToHarvestDaysMax,
      );
      return now >= readyAt;
    }

    if (planting.vegetable.harvestStartMonth != null) {
      const currentMonth = this.getWarsawMonthIndex();
      const startMonth = this.monthToIndex(
        planting.vegetable.harvestStartMonth,
      );
      const endMonth =
        planting.vegetable.harvestEndMonth != null
          ? this.monthToIndex(planting.vegetable.harvestEndMonth)
          : null;

      if (endMonth == null) {
        return currentMonth >= startMonth;
      }

      return this.isMonthInRange(currentMonth, startMonth, endMonth);
    }

    return false;
  }

  private monthToIndex(month: Month) {
    const order: Month[] = [
      Month.JANUARY,
      Month.FEBRUARY,
      Month.MARCH,
      Month.APRIL,
      Month.MAY,
      Month.JUNE,
      Month.JULY,
      Month.AUGUST,
      Month.SEPTEMBER,
      Month.OCTOBER,
      Month.NOVEMBER,
      Month.DECEMBER,
    ];

    return order.indexOf(month);
  }

  private isMonthInRange(month: number, start: number, end: number) {
    if (start <= end) {
      return month >= start && month <= end;
    }

    return month >= start || month <= end;
  }

  private getWarsawMonthIndex() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      month: '2-digit',
    });

    const value = formatter.format(new Date());
    return Number.parseInt(value, 10) - 1;
  }

  private getTodayInWarsaw() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
