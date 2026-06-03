import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BirthProfileDocument = HydratedDocument<BirthProfile>;

@Schema({ timestamps: true })
export class BirthProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  birthDate: string;

  @Prop({ required: true })
  birthTime: string;

  @Prop({ required: true, enum: ['male', 'female'] })
  gender: string;

  @Prop({ default: 'solar', enum: ['solar', 'lunar'] })
  calendar: string;

  @Prop({ default: false })
  isLeapMonth: boolean;

  @Prop()
  birthPlace?: string;

  @Prop()
  longitude?: number;

  @Prop({ default: false })
  timeUnknown: boolean;

  @Prop({ type: Object })
  natalSummary?: Record<string, unknown>;

  @Prop({ default: 'iztro-sanhe-1.0' })
  algorithmVersion: string;
}

export const BirthProfileSchema = SchemaFactory.createForClass(BirthProfile);
