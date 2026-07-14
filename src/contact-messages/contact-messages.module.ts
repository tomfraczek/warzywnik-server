import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ContactMessage } from './contact-message.entity';
import { ContactMessagesService } from './contact-messages.service';
import { MailModule } from '../mail/mail.module';
import {
  ContactMessagesController,
  ContactMessagesAdminController,
} from './contact-messages.controller';

@Module({
  imports: [MikroOrmModule.forFeature([ContactMessage]), MailModule],
  providers: [ContactMessagesService],
  controllers: [ContactMessagesController, ContactMessagesAdminController],
})
export class ContactMessagesModule {}
