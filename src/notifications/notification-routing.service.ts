import { Injectable } from '@nestjs/common';
import { NotificationRouteTarget } from '../common/enums/notification.enums';

type TaskRoutingInput = {
  bedIds: string[];
  plantingIds: string[];
};

@Injectable()
export class NotificationRoutingService {
  pickTasksRouteTarget(input: TaskRoutingInput): NotificationRouteTarget {
    if (input.plantingIds.length === 1) {
      return NotificationRouteTarget.PLANTING_DETAIL;
    }

    if (input.bedIds.length === 1) {
      return NotificationRouteTarget.BED_DETAIL;
    }

    return NotificationRouteTarget.PLANNER;
  }

  pickArticleRouteTarget(articleCount: number): NotificationRouteTarget {
    if (articleCount === 1) {
      return NotificationRouteTarget.ARTICLE_DETAIL;
    }

    return NotificationRouteTarget.ARTICLES_LIST;
  }
}
