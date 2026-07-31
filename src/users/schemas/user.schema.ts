import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../types/role.enum';

export type UserDocument = HydratedDocument<User>;

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

  @ApiProperty({
    example: false,
    description: 'Whether the user has premium access',
  })
  @Prop({ default: false })
  isPremium: boolean;

  @ApiProperty({ type: [TrainingProgramExercise], default: [] })
  @Prop({ type: [TrainingProgramExercise], default: [] })
  trainingProgram: TrainingProgramExercise[];

  @ApiProperty({
    type: [TrainingProgramExercise],
    default: [],
    description:
      'Program assigned by the coach to the athlete (separate from self-serve trainingProgram)',
  })
  @Prop({ type: [TrainingProgramExercise], default: [] })
  coachTrainingProgram: TrainingProgramExercise[];

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
