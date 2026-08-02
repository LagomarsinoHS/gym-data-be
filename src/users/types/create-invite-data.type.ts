import type { InviteStatus } from '../types/invite-status.enum';

export type CreateInviteData = {
  id: string;
  coachId: string;
  athleteId: string;
  email: string;
  status?: InviteStatus;
  invitedAt: Date;
  respondedAt?: Date | null;
};
