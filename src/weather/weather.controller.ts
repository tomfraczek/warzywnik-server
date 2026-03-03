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
  getWeather(@Req() req: RequestWithUser): Promise<WeatherResponseDto> {
    const user = this.getUserFromRequest(req);
    return this.weatherService.getWeatherForUser(user.id);
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
