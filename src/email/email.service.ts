import type { CoachInviteEmailInput } from './types/coach-invite-email.type';
import type { SendEmailInput, SendEmailResult } from './types/send-email.type';

/** Domain email port — providers (Resend, …) implement this. */
export interface EmailService {
  send(input: SendEmailInput): Promise<SendEmailResult>;
  sendCoachInvite(input: CoachInviteEmailInput): Promise<SendEmailResult>;
}
