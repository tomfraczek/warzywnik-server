import { TutorialKey } from '../tutorial.entity';

export type TutorialStateDto = {
  completed: boolean;
  version: number;
  completedAt: string | null;
};

export type TutorialsResponse = {
  enabled: boolean;
  tutorials: Partial<Record<TutorialKey, TutorialStateDto>>;
};

export type TutorialsGlobalStateDto = {
  enabled: boolean;
};
