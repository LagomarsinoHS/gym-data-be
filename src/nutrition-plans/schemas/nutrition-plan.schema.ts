import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserGoal } from '../../users/types/user-goal.enum';
import { NutritionPlanStatus } from '../types/nutrition-plan-status.enum';

export type NutritionPlanDocument = HydratedDocument<NutritionPlan>;

@Schema({ _id: false })
export class NutritionPlanPerson {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true })
  id: string;

  @ApiProperty({ example: 'Humberto' })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ required: true, trim: true })
  lastName: string;
}

@Schema({ _id: false })
export class NutritionPlanFood {
  @ApiProperty({ example: 'Pollo' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 150 })
  @Prop({ required: true })
  quantity: number;

  @ApiProperty({ example: 'g' })
  @Prop({ required: true, trim: true })
  unit: string;
}

@Schema({ _id: false })
export class NutritionPlanMeal {
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

  @ApiProperty({ type: [NutritionPlanFood], default: [] })
  @Prop({ type: [NutritionPlanFood], default: [] })
  foods: NutritionPlanFood[];

  @ApiPropertyOptional({ example: null, nullable: true })
  @Prop({ type: String, default: null })
  notes: string | null;
}

@Schema({ _id: false })
export class NutritionPlanTargets {
  @ApiProperty({ example: 2200 })
  @Prop({ required: true })
  calories: number;

  @ApiProperty({ example: 160 })
  @Prop({ required: true })
  proteinG: number;

  @ApiProperty({ example: 220 })
  @Prop({ required: true })
  carbsG: number;

  @ApiProperty({ example: 70 })
  @Prop({ required: true })
  fatG: number;
}

@Schema({ timestamps: true, collection: 'nutritionPlans', id: false })
export class NutritionPlan {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @Prop({ required: true, unique: true })
  id: string;

  @ApiProperty({ type: NutritionPlanPerson })
  @Prop({ type: NutritionPlanPerson, required: true })
  athlete: NutritionPlanPerson;

  @ApiProperty({ type: NutritionPlanPerson })
  @Prop({ type: NutritionPlanPerson, required: true })
  coach: NutritionPlanPerson;

  @ApiProperty({ example: 'Pauta de definición' })
  @Prop({ required: true, trim: true })
  title: string;

  @ApiProperty({
    enum: NutritionPlanStatus,
    example: NutritionPlanStatus.Active,
  })
  @Prop({
    required: true,
    enum: NutritionPlanStatus,
    default: NutritionPlanStatus.Active,
  })
  status: NutritionPlanStatus;

  @ApiPropertyOptional({
    enum: UserGoal,
    example: UserGoal.FatLoss,
    nullable: true,
  })
  @Prop({ type: String, enum: UserGoal, default: null })
  goal: UserGoal | null;

  @ApiProperty({ example: '2026-08-13T00:00:00.000Z' })
  @Prop({ type: Date, required: true })
  validFrom: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Prop({ type: Date, default: null })
  validUntil: Date | null;

  @ApiProperty({ type: NutritionPlanTargets })
  @Prop({ type: NutritionPlanTargets, required: true })
  targets: NutritionPlanTargets;

  @ApiProperty({ type: [NutritionPlanMeal], default: [] })
  @Prop({ type: [NutritionPlanMeal], default: [] })
  meals: NutritionPlanMeal[];

  @ApiPropertyOptional({ example: null, nullable: true })
  @Prop({ type: String, default: null })
  generalNotes: string | null;

  @ApiProperty({ example: '2026-08-13T16:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-08-13T16:00:00.000Z' })
  updatedAt?: Date;
}

export const NutritionPlanSchema = SchemaFactory.createForClass(NutritionPlan);

NutritionPlanSchema.index({ 'athlete.id': 1, status: 1 });
NutritionPlanSchema.index({ 'coach.id': 1 });
