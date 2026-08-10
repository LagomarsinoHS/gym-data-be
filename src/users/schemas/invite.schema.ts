import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PENDING_INVITE_TTL_SECONDS } from '../types/pending-invite-ttl';
import { InviteStatus } from '../types/invite-status.enum';

export type InviteDocument = HydratedDocument<Invite>;

@Schema({ timestamps: true, collection: 'invites', id: false })
export class Invite {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true, unique: true })
  id: string;

  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true, index: true })
  coachId: string;

  @ApiPropertyOptional({
    example: 'ee923be1-1192-460e-89ee-2275d4d3f206',
    nullable: true,
    description: 'Null until the athlete registers with this invite email',
  })
  @Prop({ type: String, default: null })
  athleteId: string | null;

  @ApiProperty({ example: 'athlete@example.com' })
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ enum: InviteStatus, example: InviteStatus.Pending })
  @Prop({ required: true, enum: InviteStatus, default: InviteStatus.Pending })
  status: InviteStatus;

  @ApiProperty({ example: '2026-08-02T18:00:00.000Z' })
  @Prop({ required: true })
  invitedAt: Date;

  @ApiPropertyOptional({
    example: '2026-08-03T12:00:00.000Z',
    nullable: true,
    description: 'Set when the athlete accepts or rejects (or coach cancels)',
  })
  @Prop({ type: Date, default: null })
  respondedAt: Date | null;

  @ApiProperty({ example: '2026-08-02T18:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-08-02T18:00:00.000Z' })
  updatedAt?: Date;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);

InviteSchema.index({ coachId: 1, status: 1 });
InviteSchema.index({ athleteId: 1, status: 1 });
InviteSchema.index({ email: 1, status: 1 });

/** At most one open invite per registered athlete. */
InviteSchema.index(
  { athleteId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: InviteStatus.Pending,
      athleteId: { $type: 'string' },
    },
  },
);

/** At most one open invite per email (covers pre-register). */
InviteSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: InviteStatus.Pending },
  },
);

/**
 * Auto-delete unanswered invites after 24h.
 * Accepted / rejected / cancelled no longer match the filter and are kept.
 */
InviteSchema.index(
  { invitedAt: 1 },
  {
    expireAfterSeconds: PENDING_INVITE_TTL_SECONDS,
    partialFilterExpression: { status: InviteStatus.Pending },
  },
);
