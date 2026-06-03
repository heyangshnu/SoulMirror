import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LifeContextDocument = HydratedDocument<LifeContext>;

@Schema({ timestamps: true })
export class LifeContext {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop()
  chatSummary?: string;

  @Prop({ type: [String], default: [] })
  voiceDiaryEntries: string[];

  @Prop()
  weeklyFocus?: string;

  @Prop()
  currentState?: string;

  @Prop()
  focusDirection?: string;

  @Prop()
  lastChatSummaryAt?: Date;
}

export const LifeContextSchema = SchemaFactory.createForClass(LifeContext);
