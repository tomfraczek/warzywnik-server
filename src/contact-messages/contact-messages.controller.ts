import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createContactMessageSchema,
  listAdminContactMessagesQuerySchema,
  CreateContactMessageDto,
  ListAdminContactMessagesQueryDto,
} from './dto/contact-message.schemas';

type RequestWithUser = {
  userEntity?: {
    id: string;
    email?: string | null;
    displayName?: string | null;
  };
};

@Controller('v1/contact-messages')
export class ContactMessagesController {
  constructor(
    private readonly contactMessagesService: ContactMessagesService,
  ) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(createContactMessageSchema))
    body: CreateContactMessageDto,
  ) {
    return this.contactMessagesService.create(body, req.userEntity ?? null);
  }
}

@Controller('v1/admin/contact-messages')
export class ContactMessagesAdminController {
  constructor(
    private readonly contactMessagesService: ContactMessagesService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAdminContactMessagesQuerySchema))
    query: ListAdminContactMessagesQueryDto,
  ) {
    return this.contactMessagesService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.contactMessagesService.getByIdAdmin(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.contactMessagesService.delete(id);
  }
}
