import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserTutorial, TutorialKey } from './tutorial.entity';
import { User } from '../users/user.entity';
import { PatchTutorialDto } from './dto/tutorials.schemas';
import {
  TutorialsResponse,
  TutorialStateDto,
  TutorialsGlobalStateDto,
} from './dto/tutorials.types';

@Injectable()
export class TutorialsService {
  constructor(private readonly em: EntityManager) {}

  async getTutorials(userId: string): Promise<TutorialsResponse> {
    const [user, records] = await Promise.all([
      this.em.findOneOrFail(User, { id: userId }),
      this.em.find(UserTutorial, { user: { id: userId } }),
    ]);

    const tutorials: TutorialsResponse['tutorials'] = {};
    for (const t of records) {
      tutorials[t.tutorialKey] = this.toStateDto(t);
    }

    return { enabled: user.tutorialsEnabled, tutorials };
  }

  async patchTutorialsGlobal(
    userId: string,
    enabled: boolean,
  ): Promise<TutorialsGlobalStateDto> {
    const user = await this.em.findOneOrFail(User, { id: userId });

    user.tutorialsEnabled = enabled;

    await this.em.flush();

    return { enabled: user.tutorialsEnabled };
  }

  async patchTutorial(
    userId: string,
    key: TutorialKey,
    dto: PatchTutorialDto,
  ): Promise<TutorialStateDto> {
    const user = this.em.getReference(User, userId);

    let tutorial = await this.em.findOne(UserTutorial, {
      user: { id: userId },
      tutorialKey: key,
    });

    if (!tutorial) {
      tutorial = new UserTutorial();
      tutorial.user = user;
      tutorial.tutorialKey = key;
      this.em.persist(tutorial);
    }

    tutorial.completed = dto.completed;
    tutorial.version = dto.version;
    tutorial.completedAt = dto.completed ? new Date() : null;

    await this.em.flush();

    return this.toStateDto(tutorial);
  }

  async resetTutorial(
    userId: string,
    key: TutorialKey,
  ): Promise<TutorialStateDto> {
    const tutorial = await this.em.findOne(UserTutorial, {
      user: { id: userId },
      tutorialKey: key,
    });

    if (!tutorial) {
      throw new NotFoundException(`Tutorial '${key}' not found`);
    }

    tutorial.completed = false;
    tutorial.completedAt = null;

    await this.em.flush();

    return this.toStateDto(tutorial);
  }

  async resetAllTutorials(userId: string): Promise<void> {
    await this.em.nativeDelete(UserTutorial, { user: { id: userId } });
  }

  private toStateDto(tutorial: UserTutorial): TutorialStateDto {
    return {
      completed: tutorial.completed,
      version: tutorial.version,
      completedAt: tutorial.completedAt?.toISOString() ?? null,
    };
  }
}
