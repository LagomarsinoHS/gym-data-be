import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EmailService } from '../email.service';
import { coachInviteEmail } from '../templates/coach-invite.template';
import type { CoachInviteEmailInput } from '../types/coach-invite-email.type';
import type { SendEmailInput, SendEmailResult } from '../types/send-email.type';

@Injectable()
export class ResendEmailProvider implements EmailService {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client: Resend | null;
  private readonly from: string;
  private readonly appUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('RESEND_FROM') as string;
    const appUrl = this.configService.get<string>('APP_PUBLIC_URL');
    this.appUrl = appUrl ? appUrl.replace(/\/+$/, '') : undefined;
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client) {
      this.logger.debug(`Skip email to ${input.to}: ${input.subject}`);
      return { ok: false, skipped: true, reason: 'RESEND_API_KEY missing' };
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (error || !data?.id) {
        const message = error?.message ?? 'Unknown Resend error';
        this.logger.error(`Resend rejected email to ${input.to}: ${message}`);
        return { ok: false, skipped: false, error: message };
      }

      this.logger.log(`Email sent to ${input.to} (${data.id})`);
      return { ok: true, id: data.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resend failed for ${input.to}: ${message}`);
      return { ok: false, skipped: false, error: message };
    }
  }

  sendCoachInvite(input: CoachInviteEmailInput): Promise<SendEmailResult> {
    return this.send(
      coachInviteEmail({
        ...input,
        appUrl: this.appUrl,
      }),
    );
  }
}
