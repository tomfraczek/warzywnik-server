import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { WeatherService } from './weather.service';
import { WeatherRecomputeService } from './weather-recompute.service';
import { WeatherResponseDto } from './dto/weather-response.dto';
import { WarningDto, WarningsResponseDto } from './dto/warnings-response.dto';
import { TasksResponseDto } from './dto/tasks-response.dto';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

type RequestWithUser = {
  userEntity?: User;
};

type TaskStatusFilter = 'pending' | 'done' | 'all';

@Controller('v1/users/me')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly weatherRecomputeService: WeatherRecomputeService,
  ) {}

  @Get('weather')
  async getWeather(@Req() req: RequestWithUser): Promise<WeatherResponseDto> {
    const user = this.getUserFromRequest(req);
    const weather = await this.weatherService.getWeatherForUser(user.id);
    const warnings = await this.weatherRecomputeService.getWarningsResponse(
      user.id,
      weather.stale ? 'STALE' : 'FRESH',
    );

    return {
      ...weather,
      status: this.buildWeatherStatus(warnings.items),
    };
  }

  @Get('warnings')
  async getWarnings(@Req() req: RequestWithUser): Promise<WarningsResponseDto> {
    const user = this.getUserFromRequest(req);
    const weatherBasis = await this.weatherService.tryEnsureWeatherBasis(
      user.id,
    );

    return this.weatherRecomputeService.getWarningsResponse(
      user.id,
      weatherBasis,
    );
  }

  @Get('tasks')
  async getTasks(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('includeDone') includeDone?: string,
  ): Promise<TasksResponseDto> {
    const user = this.getUserFromRequest(req);
    const normalizedStatus = this.resolveTaskStatusFilter(status, includeDone);
    return this.weatherRecomputeService.getTasksResponse(
      user.id,
      normalizedStatus,
    );
  }

  private resolveTaskStatusFilter(
    status?: string,
    includeDone?: string,
  ): TaskStatusFilter {
    if (status === 'pending' || status === 'done' || status === 'all') {
      return status;
    }

    if (includeDone === 'true') {
      return 'all';
    }

    return 'pending';
  }

  private getUserFromRequest(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }

    return req.userEntity;
  }

  private buildWeatherStatus(warnings: WarningDto[]) {
    const severityRank: Record<WarningSeverity, number> = {
      [WarningSeverity.INFO]: 1,
      [WarningSeverity.WARNING]: 2,
      [WarningSeverity.CRITICAL]: 3,
    };

    const sorted = [...warnings].sort(
      (a, b) => severityRank[b.severity] - severityRank[a.severity],
    );

    const pick = (codes: Set<WarningCode>) =>
      sorted.filter((item) => codes.has(item.code));

    const hardFrostCodes = new Set<WarningCode>([
      WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
      WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
    ]);
    const frostCodes = new Set<WarningCode>([
      WarningCode.FROST_RISK_TODAY_NIGHT,
      WarningCode.FROST_RISK_TOMORROW_NIGHT,
      WarningCode.FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
    ]);
    const stormCodes = new Set<WarningCode>([
      WarningCode.WIND_DAMAGE_TODAY_DAY,
      WarningCode.WIND_DAMAGE_TODAY_NIGHT,
      WarningCode.WIND_DAMAGE_TOMORROW_DAY,
      WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
      WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
      WarningCode.GREENHOUSE_STORM_TODAY_DAY,
      WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
    ]);
    const rainCodes = new Set<WarningCode>([
      WarningCode.HEAVY_RAIN_TODAY_DAY,
      WarningCode.HEAVY_RAIN_TODAY_NIGHT,
      WarningCode.HEAVY_RAIN_TOMORROW_DAY,
      WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
      WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
      WarningCode.OVERWATERING_PREPARE_TODAY,
      WarningCode.OVERWATERING_PREPARE_TOMORROW,
      WarningCode.OVERWATERING_CHECK_TODAY,
      WarningCode.OVERWATERING_CHECK_TOMORROW,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
    ]);
    const droughtCodes = new Set<WarningCode>([
      WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
      WarningCode.WATERING_NEEDED_TODAY,
      WarningCode.WATERING_NEEDED_TOMORROW,
      WarningCode.DROUGHT_RISK,
      WarningCode.WATERING_NEEDED,
    ]);

    const toStatus = (
      code: string,
      title: string,
      level: 'watch' | 'warning' | 'critical',
      matched: WarningDto[],
    ) => ({
      code,
      title,
      level,
      subtitle: matched[0]?.message ?? matched[0]?.title ?? title,
      validTo: matched[0]?.validTo ?? null,
      sources: Array.from(new Set(matched.map((item) => item.code))),
    });

    const hardFrost = pick(hardFrostCodes);
    if (hardFrost.length > 0) {
      return toStatus(
        'HARD_FROST',
        'Nadchodzi silny mróz',
        'critical',
        hardFrost,
      );
    }

    const frost = pick(frostCodes);
    if (frost.length > 0) {
      return toStatus('FROST', 'Nadchodzą przymrozki', 'warning', frost);
    }

    const storms = pick(stormCodes);
    if (storms.length > 0) {
      return toStatus(
        'STORM',
        'Zbliżają się gwałtowne zjawiska',
        storms[0]?.severity === WarningSeverity.CRITICAL
          ? 'critical'
          : 'warning',
        storms,
      );
    }

    const rains = pick(rainCodes);
    if (rains.length > 0) {
      return toStatus(
        'HEAVY_RAIN',
        'Możliwe intensywne opady',
        'warning',
        rains,
      );
    }

    const drought = pick(droughtCodes);
    if (drought.length > 0) {
      return toStatus(
        'DROUGHT',
        'Uwaga na suszę i przesuszenie',
        drought[0]?.severity === WarningSeverity.INFO ? 'watch' : 'warning',
        drought,
      );
    }

    return {
      code: 'OK',
      title: 'Brak istotnych zagrożeń pogodowych',
      level: 'ok' as const,
      subtitle: 'Warunki pogodowe są stabilne.',
      validTo: null,
      sources: [],
    };
  }
}
