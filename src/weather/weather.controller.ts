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
import { WarningsResponseDto } from './dto/warnings-response.dto';
import { TasksResponseDto } from './dto/tasks-response.dto';
import { WeatherStatusService } from './weather-status.service';

type RequestWithUser = {
  userEntity?: User;
};

type TaskStatusFilter = 'pending' | 'done' | 'all';

@Controller('v1/users/me')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly weatherRecomputeService: WeatherRecomputeService,
    private readonly weatherStatusService: WeatherStatusService,
  ) {}

  @Get('weather')
  async getWeather(
    @Req() req: RequestWithUser,
    @Query('debug') debug?: string,
  ): Promise<WeatherResponseDto> {
    const user = this.getUserFromRequest(req);
    const weather = await this.weatherService.getWeatherForUser(user.id);
    const snapshotData = await this.weatherService.getLatestSnapshotDataForUser(
      user.id,
    );
    const warnings = await this.weatherRecomputeService.getWarningsResponse(
      user.id,
      weather.stale ? 'STALE' : 'FRESH',
    );
    const nearTerm =
      this.weatherStatusService.buildNearTermWeatherStatusWithDebug(
        snapshotData,
      );
    const includeDebug =
      debug === 'true' && process.env.NODE_ENV !== 'production';

    return {
      ...weather,
      status: nearTerm.status,
      gardenRiskStatus: this.weatherStatusService.buildGardenRiskStatus(
        warnings.items,
      ),
      ...(includeDebug ? { statusDebug: nearTerm.debug } : {}),
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
}
