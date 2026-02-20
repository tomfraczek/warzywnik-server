import { z } from 'zod';
import { HarvestPromptAnswer } from '../../common/enums/harvest-prompt.enums';

export type HarvestConfirmationDto = {
  answer: HarvestPromptAnswer;
};

export const harvestConfirmationSchema = z.object({
  answer: z.nativeEnum(HarvestPromptAnswer),
});
