import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { NutritionDailyActivity } from '../types/nutrition-daily-activity.enum';
import { NutritionDietType } from '../types/nutrition-diet-type.enum';
import { NutritionTrainFasted } from '../types/nutrition-train-fasted.enum';
import { Role } from '../types/role.enum';
import { SubscriptionPlan } from '../types/subscription-plan.enum';
import { UserGoal } from '../types/user-goal.enum';
import { UserSex } from '../types/user-sex.enum';

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

/** Personal identity / body fields (account credentials stay on User). */
@Schema({ _id: false })
export class UserProfile {
  @ApiProperty({ example: 'Humberto' })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ required: true, trim: true })
  lastName: string;

  @ApiPropertyOptional({
    example: 175,
    nullable: true,
    description: 'Height in centimeters',
  })
  @Prop({ type: Number, default: null })
  heightCm: number | null;

  @ApiPropertyOptional({
    enum: UserSex,
    example: UserSex.Male,
    nullable: true,
    description: 'Optional sex for metrics / AI context',
  })
  @Prop({ type: String, enum: UserSex, default: null })
  sex: UserSex | null;

  @ApiPropertyOptional({
    example: '1995-06-15',
    nullable: true,
    description: 'Birth date as YYYY-MM-DD (calendar date, no timezone)',
  })
  @Prop({ type: String, default: null })
  birthDate: string | null;
}

@Schema({ _id: false })
export class NutritionMeal {
  @ApiProperty({ example: 'Desayuno' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiPropertyOptional({
    example: '08:00',
    nullable: true,
    description: 'HH:mm or null if unset',
  })
  @Prop({ type: String, default: null })
  time: string | null;
}

@Schema({ _id: false })
export class NutritionUpdatedBy {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true })
  id: string;

  @ApiProperty({ example: 'Ana' })
  @Prop({ required: true, trim: true, default: '' })
  firstName: string;

  @ApiProperty({ example: 'García' })
  @Prop({ required: true, trim: true, default: '' })
  lastName: string;
}

@Schema({ _id: false })
export class AthleteNutrition {
  @ApiPropertyOptional({
    enum: NutritionDailyActivity,
    nullable: true,
    example: NutritionDailyActivity.Sedentary,
  })
  @Prop({ type: String, enum: NutritionDailyActivity, default: null })
  dailyActivity: NutritionDailyActivity | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  @Prop({ type: Number, default: null })
  trainingsPerWeek: number | null;

  @ApiPropertyOptional({ example: 75, nullable: true })
  @Prop({ type: Number, default: null })
  avgDurationMin: number | null;

  @ApiPropertyOptional({ example: 6500, nullable: true })
  @Prop({ type: Number, default: null })
  dailySteps: number | null;

  @ApiPropertyOptional({ example: 60, nullable: true })
  @Prop({ type: Number, default: null })
  weeklyCardioMin: number | null;

  @ApiPropertyOptional({ example: 'Caminatas', nullable: true })
  @Prop({ type: String, default: null })
  extraActivity: string | null;

  @ApiPropertyOptional({
    example: '18:00',
    nullable: true,
    description: 'HH:mm or null if unset',
  })
  @Prop({ type: String, default: null })
  trainingTime: string | null;

  @ApiPropertyOptional({
    enum: NutritionTrainFasted,
    nullable: true,
    example: NutritionTrainFasted.AfterMeal,
  })
  @Prop({ type: String, enum: NutritionTrainFasted, default: null })
  trainFasted: NutritionTrainFasted | null;

  @ApiProperty({ type: [NutritionMeal], default: [] })
  @Prop({ type: [NutritionMeal], default: [] })
  meals: NutritionMeal[];

  @ApiProperty({ type: [String], default: [] })
  @Prop({ type: [String], default: [] })
  likes: string[];

  @ApiProperty({ type: [String], default: [] })
  @Prop({ type: [String], default: [] })
  avoids: string[];

  @ApiPropertyOptional({
    enum: NutritionDietType,
    nullable: true,
    example: NutritionDietType.None,
  })
  @Prop({ type: String, enum: NutritionDietType, default: null })
  dietType: NutritionDietType | null;

  @ApiProperty({ type: [String], default: [] })
  @Prop({ type: [String], default: [] })
  restrictions: string[];

  @ApiPropertyOptional({ example: null, nullable: true })
  @Prop({ type: String, default: null })
  notes: string | null;

  @ApiPropertyOptional({
    example: '2026-08-13T16:00:00.000Z',
    nullable: true,
  })
  @Prop({ type: Date, default: null })
  updatedAt: Date | null;

  @ApiPropertyOptional({
    type: NutritionUpdatedBy,
    nullable: true,
    description: 'Coach snapshot that last saved this profile',
  })
  @Prop({ type: SchemaTypes.Mixed, default: null })
  updatedBy: NutritionUpdatedBy | string | null;
}

@Schema({ timestamps: true, collection: 'users', id: false })
export class User {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true, unique: true })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ type: UserProfile })
  @Prop({ type: UserProfile, required: true })
  profile: UserProfile;

  @ApiPropertyOptional({
    enum: UserGoal,
    example: UserGoal.Hypertrophy,
    nullable: true,
    description: 'Optional training goal (not personal body data)',
  })
  @Prop({ type: String, enum: UserGoal, default: null })
  goal: UserGoal | null;

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
    type: [CoachTrainingProgram],
    default: [],
    description:
      'Reusable session templates owned by the coach (same shape as one coachTrainingProgram session). Not returned on /me — dedicated coach endpoints.',
  })
  @Prop({ type: [CoachTrainingProgram], default: [] })
  coachTemplates: CoachTrainingProgram[];

  @ApiProperty({
    type: [ProgressPhotoMonth],
    default: [],
    description:
      'Athlete progress photos by month (front/back). Not returned on /me — dedicated endpoints.',
  })
  @Prop({ type: [ProgressPhotoMonth], default: [] })
  progressPhotos: ProgressPhotoMonth[];

  @ApiPropertyOptional({
    type: AthleteNutrition,
    nullable: true,
    description:
      'Coach-managed nutrition profile. Not returned on /me — dedicated coach endpoints.',
  })
  @Prop({ type: AthleteNutrition, default: null })
  nutrition: AthleteNutrition | null;

  @ApiPropertyOptional({
    type: ProgressPhoto,
    nullable: true,
    description:
      'Account profile photo. Cloudinary: gym-app/profiles/{userId}/profilePhoto',
  })
  @Prop({ type: ProgressPhoto, default: null })
  profilePhoto: ProgressPhoto | null;

  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description:
      'Latest weightKg from progressPhotos (newest yearMonth with a weight). Recalculated on progress mutations.',
  })
  @Prop({ type: Number, default: null })
  currentWeightKg: number | null;

  @ApiProperty({
    example: '2026-08-12T18:00:00.000Z',
    description: 'Last successful login or registration',
  })
  @Prop({ type: Date, required: true })
  lastLoginAt: Date;

  @ApiPropertyOptional({
    example: '2026-08-02T18:00:00.000Z',
    description:
      'Present only when the user was soft-deleted. Active users omit this field.',
  })
  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
