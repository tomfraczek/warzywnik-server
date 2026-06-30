import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import {
  createNoteSchema,
  listNotesQuerySchema,
  updateNoteSchema,
  CreateNoteDto,
  ListNotesQueryDto,
  UpdateNoteDto,
} from './dto/note.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

@Controller('v1/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  list(
    @Req() req: { userEntity?: User },
    @Query(new ZodValidationPipe(listNotesQuerySchema))
    query: ListNotesQueryDto,
  ) {
    return this.notesService.list(req.userEntity as User, query);
  }

  @Get(':id')
  get(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notesService.getById(req.userEntity as User, id);
  }

  @Post()
  create(
    @Req() req: { userEntity?: User },
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteDto,
  ) {
    return this.notesService.create(req.userEntity as User, body);
  }

  @Patch(':id')
  update(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteDto,
  ) {
    return this.notesService.update(req.userEntity as User, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: { userEntity?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.notesService.remove(req.userEntity as User, id);
  }
}
