import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../types/role.enum';
import { SubscriptionPlan } from '../types/subscription-plan.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class UserSubscription {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.Free })
  @Prop({
    required: true,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.Free,
  })
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'When the current paid period started',
  })
  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'When premium access ends',
  })
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

@Schema({ _id: false })
export class TrainingProgramExercise {
  @ApiProperty({ example: '0001' })
  @Prop({ required: true })
  exerciseId: string;

  @ApiPropertyOptional({ example: 1 })
  @Prop()
  order?: number;

  @ApiPropertyOptional({ example: 3 })
  @Prop()
  sets?: number;

  @ApiPropertyOptional({ example: '8-12' })
  @Prop()
  reps?: string;

  @ApiPropertyOptional({ example: 90 })
  @Prop()
  rest?: number;

  @ApiPropertyOptional({ example: 'Controlar la bajada' })
  @Prop()
  notes?: string;
}

@Schema({ _id: false })
export class CoachTrainingProgram {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true })
  id: string;

  @ApiProperty({ example: 'Día A - Empuje' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 1 })
  @Prop({ required: true })
  order: number;

  @ApiProperty({ type: [TrainingProgramExercise], default: [] })
  @Prop({ type: [TrainingProgramExercise], default: [] })
  items: TrainingProgramExercise[];
}

@Schema({ _id: false })
export class ProgressPhoto {
  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/progress/user/front.png',
  })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ example: 'progress/user-id/2026-08-front' })
  @Prop({ required: true })
  publicId: string;

  @ApiProperty({ example: '2026-08-04T18:00:00.000Z' })
  @Prop({ type: Date, required: true })
  uploadedAt: Date;
}

@Schema({ _id: false })
export class ProgressPhotoMonth {
  @ApiProperty({
    example: '2026-08',
    description: 'Calendar month key YYYY-MM (unique per user)',
  })
  @Prop({ required: true })
  yearMonth: string;

  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description: 'Body weight in kg recorded for this month’s progress entry',
  })
  @Prop({ type: Number, default: null })
  weightKg: number | null;

  @ApiPropertyOptional({
    type: ProgressPhoto,
    nullable: true,
    description: 'Front progress photo for this month, if uploaded',
  })
  @Prop({ type: ProgressPhoto, default: null })
  front: ProgressPhoto | null;

  @ApiPropertyOptional({
    type: ProgressPhoto,
    nullable: true,
    description: 'Back progress photo for this month, if uploaded',
  })
  @Prop({ type: ProgressPhoto, default: null })
  back: ProgressPhoto | null;
}

@Schema({ timestamps: true, collection: 'users', id: false })
export class User {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true, unique: true })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ example: 'Humberto' })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ required: true })
  lastName: string;

  @ApiProperty({ example: 'examplePassword', writeOnly: true })
  @Prop({ required: true })
  password: string;

  @ApiProperty({ enum: Role, example: Role.Athlete })
  @Prop({ required: true, enum: Role })
  role: Role;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Assigned coach user id, if any',
  })
  @Prop({ type: String, default: null })
  coachId: string | null;

  @ApiProperty({ example: true })
  @Prop({ default: true })
  active: boolean;

  @ApiProperty({ type: UserSubscription })
  @Prop({
    type: UserSubscription,
    default: () => ({
      plan: SubscriptionPlan.Free,
      startedAt: null,
      expiresAt: null,
    }),
  })
  subscription: UserSubscription;

  @ApiProperty({ type: [TrainingProgramExercise], default: [] })
  @Prop({ type: [TrainingProgramExercise], default: [] })
  trainingProgram: TrainingProgramExercise[];

  @ApiProperty({
    type: [CoachTrainingProgram],
    default: [],
    description:
      'Programs assigned by the coach to the athlete (separate from self-serve trainingProgram)',
  })
  @Prop({ type: [CoachTrainingProgram], default: [] })
  coachTrainingProgram: CoachTrainingProgram[];

  @ApiProperty({
    type: [ProgressPhotoMonth],
    default: [],
    description:
      'Athlete progress photos by month (front/back). Not returned on /me — dedicated endpoints.',
  })
  @Prop({ type: [ProgressPhotoMonth], default: [] })
  progressPhotos: ProgressPhotoMonth[];

  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description:
      'Latest weightKg from progressPhotos (newest yearMonth with a weight). Recalculated on progress mutations.',
  })
  @Prop({ type: Number, default: null })
  currentWeightKg: number | null;

  @ApiPropertyOptional({
    example: '2026-08-02T18:00:00.000Z',
    description:
      'Present only when the user was soft-deleted. Active users omit this field.',
  })
  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
