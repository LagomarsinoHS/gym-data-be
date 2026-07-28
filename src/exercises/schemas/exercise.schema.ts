import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExerciseDocument = HydratedDocument<Exercise>;

@Schema({ collection: 'exercises', timestamps: false, id: false })
export class Exercise {
  @ApiProperty({ example: '0001' })
  @Prop({ required: true })
  id: string;

  @ApiProperty({ example: '3/4 sit-up' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ example: 'waist' })
  @Prop()
  category?: string;

  @ApiPropertyOptional({ example: 'waist' })
  @Prop()
  body_part?: string;

  @ApiPropertyOptional({ example: 'body weight' })
  @Prop()
  equipment?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { en: 'Lie flat on your back...' },
  })
  @Prop({ type: Object })
  instructions?: Record<string, string>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  @Prop({ type: Object })
  instruction_steps?: Record<string, string[]>;

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

  @ApiPropertyOptional({ example: '2026-03-18T12:31:32.854798+00:00' })
  @Prop()
  created_at?: string;

  @ApiPropertyOptional({
    example: '© Gym visual — https://gymvisual.com/',
  })
  @Prop()
  attribution?: string;
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
