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

  @Prop({ enum: ['single', 'dating', 'married', 'separated'] })
  relationshipStatus?: string;

  @Prop()
  hasChildren?: boolean;

  @Prop()
  childAge?: number;

  @Prop()
  parentHealthConcern?: boolean;

  @Prop()
  cityChangeRecently?: boolean;

  @Prop({ enum: ['low', 'medium', 'high'] })
  financialPressure?: string;

  @Prop()
  careerStage?: string;

  @Prop()
  partnerNotes?: string;

  @Prop()
  currentConflict?: string;

  @Prop()
  freeText?: string;

  @Prop()
  chatUploadText?: string;

  @Prop({ type: Object })
  chatPatterns?: {
    summary?: string;
    patterns?: string[];
    escalationLine?: number;
    recommendations?: string[];
  };
}

export const LifeContextSchema = SchemaFactory.createForClass(LifeContext);
