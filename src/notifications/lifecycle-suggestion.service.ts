import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { Planting } from '../plantings/planting.entity';
import { PlantingStatus } from '../common/enums/planting.enums';
import { NotificationEventService } from './notification-event.service';
import { NotificationPriority } from '../common/enums/notification.enums';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Injectable()
export class LifecycleSuggestionService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationEventService: NotificationEventService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  @Cron('15 */3 * * *', { name: 'notification-lifecycle-suggestions' })
  async generateSuggestions(): Promise<void> {
    const now = new Date();
    const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const candidates = await this.em.find(
      Planting,
      {
        status: {
          $in: [
            PlantingStatus.NEW,
            PlantingStatus.IN_GROUND,
            PlantingStatus.READY_FOR_FINAL_HARVEST,
          ],
        },
      },
      {
        populate: ['user', 'bed', 'vegetable'],
      },
    );

    for (const planting of candidates) {
      if (!this.entitlementsService.isPremium(planting.user)) {
        continue;
      }

      if (
        planting.harvestWindowStart &&
        planting.harvestWindowStart >= now &&
        planting.harvestWindowStart <= nextDay
      ) {
        await this.notificationEventService.publishLifecycleSuggestionEvent({
          userId: planting.user.id,
          plantingId: planting.id,
          bedId: planting.bed.id,
          suggestedAction: `Zaczyna się okno zbioru dla ${planting.vegetable.name}.`,
          priority: NotificationPriority.HIGH,
        });
      }

      if (
        planting.harvestWindowEnd &&
        planting.harvestWindowEnd < now &&
        planting.status !== PlantingStatus.HARVESTED
      ) {
        await this.notificationEventService.publishLifecycleSuggestionEvent({
          userId: planting.user.id,
          plantingId: planting.id,
          bedId: planting.bed.id,
          suggestedAction: `Okno zbioru dla ${planting.vegetable.name} mogło zostać pominięte.`,
          priority: NotificationPriority.HIGH,
        });
      }
    }

    this.em.clear();
  }
}
