import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import {
  createDeviceSchema,
  updateDeviceSchema,
  CreateDeviceDto,
  UpdateDeviceDto,
} from './dto/device.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(createDeviceSchema)) body: CreateDeviceDto,
  ) {
    return this.devicesService.upsert(req.userEntity as User, body);
  }

  @Patch(':id')
  disable(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) _body: UpdateDeviceDto,
  ) {
    void _body;
    return this.devicesService.disable(req.userEntity as User, id);
  }
}
