import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AgentRunDocument = HydratedDocument<AgentRun>;

@Schema({ timestamps: true })
export class AgentRun {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  slug: string;

  @Prop({ required: true })
  runId: string;

  @Prop({ default: 'init' })
  kind: string;

  @Prop({ default: 0 })
  eventsCount: number;

  @Prop({ default: 0 })
  contractErrors: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}

export const AgentRunSchema = SchemaFactory.createForClass(AgentRun);

AgentRunSchema.index({ userId: 1, runId: 1 }, { unique: true });
