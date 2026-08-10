import type { InviteStatus } from './invite-status.enum';

export type CreateInviteData = {
  id: string;
  coachId: string;
  athleteId: string | null;
  email: string;
  status?: InviteStatus;
  invitedAt: Date;
  respondedAt?: Date | null;
};
