import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../../common/enums/action.enums';
import { WarningCode } from '../../common/enums/warning.enums';
import { User } from '../../users/user.entity';
import { ActionTask } from '../../action-tasks/action-task.entity';
import { WarningInstance } from './warning-instance.entity';
import { Bed } from '../../beds/bed.entity';
import { Planting } from '../../plantings/planting.entity';

type TaskProposal = {
  dedupeKey: string;
  title: string;
  description?: string | null;
  dueAt: Date;
  targetType: ActionTaskTargetType;
  bedId?: string | null;
  plantingId?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class WeatherTaskPlannerService {
  private readonly logger = new Logger(WeatherTaskPlannerService.name);

  constructor(private readonly em: EntityManager) {}

  async recomputeWeatherTasksForUser(userId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const warnings = await this.em.find(
      WarningInstance,
      {
        user: userId,
        isActive: true,
        validTo: { $gt: now },
      },
      { populate: ['bed', 'planting', 'planting.vegetable'] },
    );

    const proposals = this.buildProposalsFromWarnings(warnings, now);
    const proposalByKey = new Map(
      proposals.map((item) => [item.dedupeKey, item]),
    );

    await this.em.transactional(async (em) => {
      const existing = await em.find(ActionTask, {
        user: userId,
        source: ActionTaskSource.WEATHER_WARNING,
        status: ActionTaskStatus.PENDING,
        dedupeKey: { $ne: null },
      });

      const existingByKey = new Map(
        existing
          .filter((item) => item.dedupeKey)
          .map((item) => [item.dedupeKey as string, item]),
      );

      for (const proposal of proposals) {
        const current = existingByKey.get(proposal.dedupeKey);
        if (current) {
          current.title = proposal.title;
          current.description = proposal.description ?? null;
          current.dueAt = proposal.dueAt;
          current.targetType = proposal.targetType;
          current.bed = proposal.bedId
            ? em.getReference(Bed, proposal.bedId)
            : null;
          current.planting = proposal.plantingId
            ? em.getReference(Planting, proposal.plantingId)
            : null;
          current.metadata = proposal.metadata ?? null;
          continue;
        }

        const task = new ActionTask();
        task.user = user;
        task.status = ActionTaskStatus.PENDING;
        task.source = ActionTaskSource.WEATHER_WARNING;
        task.title = proposal.title;
        task.description = proposal.description ?? null;
        task.dueAt = proposal.dueAt;
        task.targetType = proposal.targetType;
        task.dedupeKey = proposal.dedupeKey;
        task.metadata = proposal.metadata ?? null;
        task.isManuallyRescheduled = false;
        task.generatedAt = now;

        if (proposal.bedId) {
          task.bed = em.getReference(Bed, proposal.bedId);
        }

        if (proposal.plantingId) {
          task.planting = em.getReference(Planting, proposal.plantingId);
        }

        em.persist(task);
      }

      for (const task of existing) {
        if (!task.dedupeKey) continue;
        if (proposalByKey.has(task.dedupeKey)) continue;

        task.status = ActionTaskStatus.CANCELED;
      }

      await em.flush();
    });

    this.logger.log(
      `recomputed weather tasks user=${userId} proposals=${proposals.length}`,
    );
  }

  private buildProposalsFromWarnings(
    warnings: WarningInstance[],
    now: Date,
  ): TaskProposal[] {
    const proposals: TaskProposal[] = [];

    for (const warning of warnings) {
      const key = `weather:${warning.dedupeKey}`;

      switch (warning.code) {
        case WarningCode.FROST_RISK_NEXT_7_DAYS:
        case WarningCode.HARD_FROST_RISK_NEXT_7_DAYS: {
          const riskDate = this.getDate(warning.values?.riskDate);
          const dueAt = riskDate
            ? new Date(riskDate.getTime() - 12 * 60 * 60 * 1000)
            : now;
          proposals.push({
            dedupeKey: key,
            title: 'Okryj rośliny',
            description: 'Przygotuj osłony przed prognozowanym mrozem.',
            dueAt,
            targetType: ActionTaskTargetType.USER,
          });
          break;
        }

        case WarningCode.DROUGHT_RISK_NEXT_7_DAYS:
          proposals.push({
            dedupeKey: key,
            title: 'Podlej',
            description: 'Wykonaj podlewanie ze względu na ryzyko suszy.',
            dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
            targetType: ActionTaskTargetType.USER,
          });
          break;

        case WarningCode.HEAVY_RAIN_RISK_NEXT_48H:
          proposals.push({
            dedupeKey: key,
            title: 'Sprawdź odpływ / zabezpiecz grządkę',
            description: 'Przygotuj odpływ wody przed intensywnymi opadami.',
            dueAt: this.hoursBefore(warning.details?.peakHour, 3, now),
            targetType: ActionTaskTargetType.USER,
          });
          break;

        case WarningCode.WIND_DAMAGE_RISK_NEXT_48H:
          proposals.push({
            dedupeKey: key,
            title: 'Zabezpiecz podpory',
            description: 'Wzmocnij podpory przed silnym wiatrem.',
            dueAt: this.hoursBefore(warning.details?.peakHour, 4, now),
            targetType: ActionTaskTargetType.USER,
          });
          break;

        case WarningCode.OVERWATERING_RISK:
          proposals.push({
            dedupeKey: key,
            title: 'Sprawdź zastoiska / drenaż',
            description: 'Sprawdź odpływ i ewentualnie popraw drenaż.',
            dueAt: this.hoursBefore(warning.details?.peakHour, 2, now),
            targetType: ActionTaskTargetType.BED,
            bedId: warning.bed?.id ?? null,
          });
          break;

        case WarningCode.GERMINATION_TOO_COLD:
          proposals.push({
            dedupeKey: key,
            title: 'Wstrzymaj siew / osłoń wysiew',
            description: 'Temperatura za niska dla bezpiecznego kiełkowania.',
            dueAt: now,
            targetType: ActionTaskTargetType.PLANTING,
            bedId: warning.bed?.id ?? null,
            plantingId: warning.planting?.id ?? null,
          });
          break;

        default:
          break;
      }
    }

    return proposals;
  }

  private hoursBefore(value: unknown, hours: number, fallback: Date): Date {
    const date = this.getDate(value);
    if (!date) {
      return fallback;
    }

    return new Date(date.getTime() - hours * 60 * 60 * 1000);
  }

  private getDate(value: unknown): Date | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }
}
