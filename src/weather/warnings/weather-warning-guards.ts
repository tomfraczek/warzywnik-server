import { WarningCode } from '../../common/enums/warning.enums';
import { WarningInstanceUpsertInput } from './weather-warning.types';

// Precipitation alert codes that indicate significant rain/storm for each day.
// When these are present, watering/drought warnings are logically contradictory.
const TODAY_PRECIPITATION_CODES: ReadonlySet<WarningCode> = new Set([
  WarningCode.HEAVY_RAIN_TODAY_DAY,
  WarningCode.HEAVY_RAIN_TODAY_NIGHT,
  WarningCode.OVERWATERING_PREPARE_TODAY,
  WarningCode.OVERWATERING_CHECK_TODAY,
]);

const TOMORROW_PRECIPITATION_CODES: ReadonlySet<WarningCode> = new Set([
  WarningCode.HEAVY_RAIN_TOMORROW_DAY,
  WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
  WarningCode.OVERWATERING_PREPARE_TOMORROW,
  WarningCode.OVERWATERING_CHECK_TOMORROW,
]);

/**
 * Removes logically contradictory warnings from a combined evaluator output.
 *
 * Rules:
 * - WATERING_NEEDED_TODAY is suppressed when today already has heavy rain or overwatering alerts.
 * - WATERING_NEEDED_TOMORROW is suppressed when tomorrow already has heavy rain or overwatering alerts.
 * - DROUGHT_RISK_NEXT_7_DAYS is suppressed when any rain/overwatering alert is present for
 *   today or tomorrow (heavy rain now contradicts a drought-risk forecast).
 */
export const resolveWarningContradictions = (
  warnings: WarningInstanceUpsertInput[],
): WarningInstanceUpsertInput[] => {
  const codes = new Set(warnings.map((w) => w.code));

  const todayHasPrecipitation = [...TODAY_PRECIPITATION_CODES].some((c) =>
    codes.has(c),
  );
  const tomorrowHasPrecipitation = [...TOMORROW_PRECIPITATION_CODES].some(
    (c) => codes.has(c),
  );
  const anyPrecipitationAlert = todayHasPrecipitation || tomorrowHasPrecipitation;

  if (!anyPrecipitationAlert) return warnings;

  return warnings.filter((w) => {
    if (w.code === WarningCode.WATERING_NEEDED_TODAY && todayHasPrecipitation) {
      return false;
    }
    if (
      w.code === WarningCode.WATERING_NEEDED_TOMORROW &&
      tomorrowHasPrecipitation
    ) {
      return false;
    }
    if (
      w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS &&
      anyPrecipitationAlert
    ) {
      return false;
    }
    return true;
  });
};
