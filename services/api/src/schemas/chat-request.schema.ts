import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatRequestDocument = HydratedDocument<ChatRequest>;

@Schema({ timestamps: true })
export class ChatRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  toUserId: Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @Prop()
  message?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatRequestSchema = SchemaFactory.createForClass(ChatRequest);
ChatRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
