import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from './bed.entity';
import { Soil } from '../soils/soil.entity';
import { WarningInstance } from '../weather/warnings/warning-instance.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';
import {
  CreateBedDto,
  ListBedsQueryDto,
  UpdateBedDto,
} from './dto/bed.schemas';
import { User } from '../users/user.entity';
import { CultivationEnvironment } from '../common/enums/bed.enums';
import { WeatherRecomputeService } from '../weather/weather-recompute.service';
import { GrowingSpace } from '../growing-spaces/growing-space.entity';
import { GrowingSpaceType } from '../common/enums/growing-space.enums';

@Injectable()
export class BedsService {
  constructor(
    private readonly em: EntityManager,
    private readonly weatherRecomputeService: WeatherRecomputeService,
  ) {}

  async list(user: User, query: ListBedsQueryDto) {
    const { page, limit, q, isActive } = query;

    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { locationLabel: { $ilike: `%${q}%` } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.em.findAndCount(Bed, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
      populate: ['soil', 'growingSpace'],
    });

    return {
      items: items.map((item) => this.serializeBed(item)),
      page,
      limit,
      total,
    };
  }

  async getById(user: User, id: string) {
    const bed = await this.em.findOne(
      Bed,
      { id, user: user.id },
      {
        populate: ['soil', 'growingSpace'],
      },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return this.serializeBed(bed);
  }

  async create(user: User, dto: CreateBedDto) {
    const bed = new Bed();
    bed.user = user;
    bed.name = dto.name;
    bed.description = dto.description ?? null;
    bed.locationLabel = dto.locationLabel ?? null;
    bed.lengthCm = dto.lengthCm ?? null;
    bed.widthCm = dto.widthCm ?? null;
    bed.depthCm = dto.depthCm ?? null;
    bed.soilTestingEnabled = dto.soilTestingEnabled ?? false;
    bed.measuredN = dto.measuredN ?? null;
    bed.measuredP = dto.measuredP ?? null;
    bed.measuredK = dto.measuredK ?? null;
    bed.measuredPh = dto.measuredPh ?? null;
    bed.isActive = dto.isActive ?? true;
    bed.cultivationEnvironment =
      dto.cultivationEnvironment ?? CultivationEnvironment.GROUND_OUTDOOR;
    bed.growingSpace = await this.resolveGrowingSpaceForCreate(user, dto);

    const soilId = dto.soilId !== undefined ? dto.soilId : dto.soil;

    if (soilId === null) {
      bed.soil = null;
    } else if (soilId) {
      const soil = await this.em.findOne(Soil, { id: soilId });
      if (!soil) {
        throw new BadRequestException('Soil not found');
      }
      bed.soil = soil;
    }

    await this.em.persistAndFlush(bed);

    await this.em.populate(bed, ['soil', 'growingSpace']);
    return this.serializeBed(bed);
  }

  async update(user: User, id: string, dto: UpdateBedDto) {
    const bed = await this.em.findOne(
      Bed,
      { id, user: user.id },
      {
        populate: ['soil', 'growingSpace'],
      },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const previousIsActive = bed.isActive;

    if (dto.name !== undefined) bed.name = dto.name;
    if (dto.description !== undefined) bed.description = dto.description;
    if (dto.locationLabel !== undefined) bed.locationLabel = dto.locationLabel;
    if (dto.lengthCm !== undefined) bed.lengthCm = dto.lengthCm;
    if (dto.widthCm !== undefined) bed.widthCm = dto.widthCm;
    if (dto.depthCm !== undefined) bed.depthCm = dto.depthCm;
    if (dto.soilTestingEnabled !== undefined)
      bed.soilTestingEnabled = dto.soilTestingEnabled;
    if (dto.measuredN !== undefined) bed.measuredN = dto.measuredN;
    if (dto.measuredP !== undefined) bed.measuredP = dto.measuredP;
    if (dto.measuredK !== undefined) bed.measuredK = dto.measuredK;
    if (dto.measuredPh !== undefined) bed.measuredPh = dto.measuredPh;
    if (dto.isActive !== undefined) bed.isActive = dto.isActive;
    if (dto.cultivationEnvironment !== undefined) {
      bed.cultivationEnvironment = dto.cultivationEnvironment;
    }

    if (dto.growingSpaceId !== undefined) {
      const growingSpace = await this.em.findOne(GrowingSpace, {
        id: dto.growingSpaceId,
        user: user.id,
      });

      if (!growingSpace) {
        throw new BadRequestException('Growing space not found');
      }

      bed.growingSpace = growingSpace;
    }

    const soilId = dto.soilId !== undefined ? dto.soilId : dto.soil;

    if (soilId === null) {
      bed.soil = null;
    } else if (soilId !== undefined) {
      const soil = await this.em.findOne(Soil, { id: soilId });
      if (!soil) {
        throw new BadRequestException('Soil not found');
      }
      bed.soil = soil;
    }

    await this.em.flush();

    await this.handleBedStatusTransition(
      user,
      bed.id,
      previousIsActive,
      bed.isActive,
    );

    // NOTE: Bed changes (soil, depth, measurements) affect planting warnings.
    // Clients should refetch plantings for this bed after updates.
    return this.serializeBed(bed);
  }

  async remove(user: User, id: string) {
    const bed = await this.em.findOne(Bed, { id, user: user.id });
    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const previousIsActive = bed.isActive;
    bed.isActive = false;
    await this.em.flush();

    await this.handleBedStatusTransition(
      user,
      bed.id,
      previousIsActive,
      bed.isActive,
    );
  }

  private async handleBedStatusTransition(
    user: User,
    bedId: string,
    previousIsActive: boolean,
    nextIsActive: boolean,
  ) {
    if (previousIsActive === nextIsActive) {
      return;
    }

    if (!nextIsActive) {
      const now = new Date();

      const warnings = await this.em.find(WarningInstance, {
        user: user.id,
        isActive: true,
        $or: [{ bed: bedId }, { planting: { bed: bedId } }],
      });

      for (const warning of warnings) {
        warning.isActive = false;
        warning.validTo = now;
        warning.computedAt = now;
      }

      const tasks = await this.em.find(ActionTask, {
        user: user.id,
        status: ActionTaskStatus.PENDING,
        $or: [{ bed: bedId }, { planting: { bed: bedId } }],
      });

      for (const task of tasks) {
        task.status = ActionTaskStatus.CANCELED;
      }

      await this.em.flush();
      return;
    }

    await this.weatherRecomputeService.recomputeWarnings(user.id);
    await this.weatherRecomputeService.recomputeTasks(user.id);
  }

  private serializeBed(bed: Bed) {
    return {
      id: bed.id,
      name: bed.name,
      description: bed.description ?? null,
      locationLabel: bed.locationLabel ?? null,
      lengthCm: bed.lengthCm ?? null,
      widthCm: bed.widthCm ?? null,
      depthCm: bed.depthCm ?? null,
      soilId: bed.soil?.id ?? null,
      soilTestingEnabled: bed.soilTestingEnabled,
      measuredN: bed.measuredN ?? null,
      measuredP: bed.measuredP ?? null,
      measuredK: bed.measuredK ?? null,
      measuredPh: bed.measuredPh ?? null,
      isActive: bed.isActive,
      cultivationEnvironment: bed.cultivationEnvironment,
      growingSpaceId: bed.growingSpace?.id ?? null,
      growingSpace: bed.growingSpace
        ? {
            id: bed.growingSpace.id,
            name: bed.growingSpace.name,
            type: bed.growingSpace.type,
          }
        : null,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt,
    };
  }

  private async resolveGrowingSpaceForCreate(user: User, dto: CreateBedDto) {
    if (dto.growingSpaceId) {
      const growingSpace = await this.em.findOne(GrowingSpace, {
        id: dto.growingSpaceId,
        user: user.id,
      });

      if (!growingSpace) {
        throw new BadRequestException('Growing space not found');
      }

      return growingSpace;
    }

    const existingDefault = await this.em.findOne(GrowingSpace, {
      user: user.id,
      name: 'Domyślna przestrzeń',
    });

    if (existingDefault) {
      return existingDefault;
    }

    const createdDefault = new GrowingSpace();
    createdDefault.user = user;
    createdDefault.name = 'Domyślna przestrzeń';
    createdDefault.type = GrowingSpaceType.OUTDOOR;
    this.em.persist(createdDefault);
    await this.em.flush();

    return createdDefault;
  }
}
