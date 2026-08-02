import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
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

  @ApiProperty({ example: 'ee923be1-1192-460e-89ee-2275d4d3f206' })
  @Prop({ required: true, index: true })
  athleteId: string;

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
/** At most one open invite per athlete. */
InviteSchema.index(
  { athleteId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: InviteStatus.Pending },
  },
);
