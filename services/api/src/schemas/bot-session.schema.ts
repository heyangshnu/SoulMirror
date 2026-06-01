import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BotSessionDocument = HydratedDocument<BotSession>;

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class BotSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: '心镜对话' })
  title: string;

  @Prop({ type: [ChatMessage], default: [] })
  messages: ChatMessage[];
}

export const BotSessionSchema = SchemaFactory.createForClass(BotSession);
