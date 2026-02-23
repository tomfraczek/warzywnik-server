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
import { HarvestPromptAnswer } from '../common/enums/harvest-prompt.enums';
import { HarvestConfirmationDto } from './dto/harvest-prompt.schemas';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { toDateOnlyInTimezone } from '../common/types/date-utils';

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

    const today = this.getTodayInWarsawDate();

    const items = plantings
      .filter((planting) => {
        const state = statesByPlantingId.get(planting.id);

        if (!this.isReadyForHarvest(planting, today)) return false;
        if (planting.harvestedAt) return false;

        if (state?.snoozeUntil && state.snoozeUntil > today) {
          return false;
        }

        return !state?.lastShownOn || state.lastShownOn < today;
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
        harvestWindowStart: planting.harvestWindowStart ?? null,
        harvestWindowEnd: planting.harvestWindowEnd ?? null,
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
        state.bed = planting.bed;
      }

      state.lastShownOn = this.getTodayInWarsawDate();

      if (dto.answer === HarvestPromptAnswer.NO) {
        await em.persistAndFlush(state);
        return null;
      }

      const now = new Date();
      planting.harvestedAt = now;
      planting.status = PlantingStatus.FINISHED;

      await em.persistAndFlush([state, planting]);

      await this.actionAutomationService.recomputeForPlanting({
        user,
        plantingId: planting.id,
        reason: 'HARVEST_CONFIRMED',
      });

      const postHarvestActions =
        await this.actionAutomationService.getPostHarvestActionSuggestions(
          planting.vegetable.id,
        );

      return {
        plantingId: planting.id,
        bedId: planting.bed.id,
        proposals: postHarvestActions,
      };
    });
  }

  private isReadyForHarvest(planting: Planting, today?: Date) {
    if (
      planting.status === PlantingStatus.CANCELLED ||
      planting.status === PlantingStatus.FINISHED
    ) {
      return false;
    }

    const day = today ?? this.getTodayInWarsawDate();

    if (planting.harvestWindowStart) {
      const start = toDateOnlyInTimezone(
        planting.harvestWindowStart,
        planting.timelineTimezone,
      );

      if (day < start) {
        return false;
      }

      if (planting.harvestWindowEnd) {
        const end = toDateOnlyInTimezone(
          planting.harvestWindowEnd,
          planting.timelineTimezone,
        );

        return day <= end;
      }

      return true;
    }

    return false;
  }

  private getTodayInWarsawDate() {
    return toDateOnlyInTimezone(new Date(), 'Europe/Warsaw');
  }
}
