import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { AgentInitPhase } from '../agent.constants';

export type AgentInitStatusDocument = HydratedDocument<AgentInitStatus>;

@Schema({ timestamps: true })
export class AgentInitStatus {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  slug: string;

  @Prop({
    required: true,
    enum: ['pending', 'running', 'chat_ready', 'partial', 'done', 'failed', 'skipped'],
    default: 'pending',
  })
  phase: AgentInitPhase;

  @Prop({ default: 0 })
  fuxiNodesDone: number;

  @Prop({ default: 16 })
  fuxiNodesTotal: number;

  @Prop({ type: [String], default: [] })
  completedNodeCodes: string[];

  @Prop({ type: Object })
  birthPayload?: Record<string, unknown>;

  @Prop()
  lastError?: string;

  @Prop()
  lastRunId?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({ default: false })
  bootstrapReady?: boolean;

  @Prop()
  bootstrapReadyAt?: Date;
}

export const AgentInitStatusSchema = SchemaFactory.createForClass(AgentInitStatus);
