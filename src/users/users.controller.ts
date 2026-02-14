/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { MeResponse } from './dto/me.types';
import {
  ExportQueryDto,
  PatchMeDto,
  exportQuerySchema,
  patchMeSchema,
} from './dto/me.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@Req() req: RequestWithUser): Promise<MeResponse> {
    const user = this.getUserFromRequest(req);
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  patchMe(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(patchMeSchema)) body: PatchMeDto,
  ): Promise<MeResponse> {
    const user = this.getUserFromRequest(req);
    return this.usersService.patchMe(user.id, body);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteMe(@Req() req: RequestWithUser): Promise<void> {
    const user = this.getUserFromRequest(req);
    await this.usersService.deleteMe(user.id);
  }

  @Get('me/export')
  async exportMe(
    @Req() req: RequestWithUser,
    @Query(new ZodValidationPipe(exportQuerySchema)) query: ExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse | string> {
    const user = this.getUserFromRequest(req);
    const data = await this.usersService.exportMe(user.id);
    const today = new Date().toISOString().slice(0, 10);

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="warzywnik-export-${today}.csv"`,
      );
      return this.toCsv(data);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="warzywnik-export-${today}.json"`,
    );
    return data;
  }

  private toCsv(data: MeResponse): string {
    const header = [
      'id',
      'email',
      'displayName',
      'avatarId',
      'themeMode',
      'language',
      'temperatureUnit',
      'precipitationUnit',
      'areaUnit',
      'locationMode',
      'locationLabel',
      'locationLat',
      'locationLon',
      'locationUpdatedAt',
    ];

    const row = [
      data.id,
      data.email ?? '',
      data.displayName ?? '',
      data.avatarId ?? '',
      data.themeMode,
      data.language,
      data.temperatureUnit,
      data.precipitationUnit,
      data.areaUnit,
      data.locationMode,
      data.locationLabel ?? '',
      data.locationLat != null ? String(data.locationLat) : '',
      data.locationLon != null ? String(data.locationLon) : '',
      data.locationUpdatedAt ? data.locationUpdatedAt.toISOString() : '',
    ].map((value) => this.escapeCsvValue(value));

    return `${header.join(',')}\n${row.join(',')}\n`;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private getUserFromRequest(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }

    return req.userEntity;
  }
}
