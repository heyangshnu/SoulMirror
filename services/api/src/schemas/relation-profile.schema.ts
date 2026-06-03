import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RelationProfileDocument = HydratedDocument<RelationProfile>;

@Schema({ timestamps: true })
export class RelationProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['spouse', 'child', 'parent', 'sibling', 'other'] })
  relationType: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  birthDate: string;

  @Prop({ required: true })
  birthTime: string;

  @Prop({ required: true, enum: ['male', 'female'] })
  gender: string;

  @Prop({ default: 'solar' })
  calendar: string;

  @Prop()
  birthPlace?: string;

  @Prop({ default: false })
  timeUnknown: boolean;

  @Prop({ type: Object })
  natalSummary?: Record<string, unknown>;
}

export const RelationProfileSchema = SchemaFactory.createForClass(RelationProfile);
