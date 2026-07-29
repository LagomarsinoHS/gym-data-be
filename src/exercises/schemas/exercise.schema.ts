import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExerciseDocument = HydratedDocument<Exercise>;

@Schema({ _id: false })
export class ExerciseName {
  @ApiProperty({ example: '3/4 sit-up' })
  @Prop({ required: true })
  en: string;

  @ApiProperty({ example: 'Abdominales a 3/4' })
  @Prop({ required: true })
  es: string;
}

@Schema({ _id: false })
export class LocalizedText {
  @ApiProperty({ example: 'Lie flat on your back...' })
  @Prop()
  en?: string;

  @ApiProperty({ example: 'Túmbate sobre tu espalda...' })
  @Prop()
  es?: string;
}

@Schema({ _id: false })
export class LocalizedSteps {
  @ApiProperty({ type: [String], example: ['Lie flat on your back...'] })
  @Prop({ type: [String] })
  en?: string[];

  @ApiProperty({ type: [String], example: ['Túmbate sobre tu espalda...'] })
  @Prop({ type: [String] })
  es?: string[];
}

@Schema({ timestamps: true, id: false })
export class Exercise {
  @ApiProperty({ example: '0001' })
  @Prop({ required: true })
  id: string;

  @ApiProperty({ type: ExerciseName })
  @Prop({ type: ExerciseName, required: true })
  name: ExerciseName;

  @ApiPropertyOptional({ example: 'waist' })
  @Prop()
  category?: string;

  @ApiPropertyOptional({ example: 'waist' })
  @Prop()
  body_part?: string;

  @ApiPropertyOptional({ example: 'body weight' })
  @Prop()
  equipment?: string;

  @ApiPropertyOptional({ type: LocalizedText })
  @Prop({ type: LocalizedText })
  instructions?: LocalizedText;

  @ApiPropertyOptional({ type: LocalizedSteps })
  @Prop({ type: LocalizedSteps })
  instruction_steps?: LocalizedSteps;

  @ApiPropertyOptional({ example: 'hip flexors' })
  @Prop()
  muscle_group?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['hip flexors', 'lower back'],
  })
  @Prop({ type: [String], default: [] })
  secondary_muscles?: string[];

  @ApiPropertyOptional({ example: 'abs' })
  @Prop()
  target?: string;

  @ApiPropertyOptional({ example: 'images/0001-mN.jpg' })
  @Prop()
  image?: string;

  @ApiPropertyOptional({ example: 'videos/0001-omN.gif' })
  @Prop()
  gif_url?: string;

  @ApiPropertyOptional({ example: '2gPf' })
  @Prop()
  media_id?: string;

  @ApiPropertyOptional({
    example: '© Gym visual — https://gymvisual.com/',
  })
  @Prop()
  attribution?: string;

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt?: Date;
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
