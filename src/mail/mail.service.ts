import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly adminEmail = 'tomfraczekdev@gmail.com';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set — email sending is disabled');
    }
  }

  async sendVegetableSuggestionNotification(name: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Email skipped (no API key). Would notify about suggestion: "${name}"`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: 'Warzywnik <noreply@warzywnik.app>',
        to: this.adminEmail,
        subject: 'Nowe zgłoszenie brakującego warzywa',
        text: `Nowe zgłoszenie brakującego warzywa: ${name} dla Twojej aplikacji warzywnik`,
      });
      this.logger.log(`Suggestion notification sent for: "${name}"`);
    } catch (err) {
      this.logger.error('Failed to send suggestion notification email', err);
    }
  }
}
