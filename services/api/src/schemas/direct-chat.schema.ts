import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DirectChatDocument = HydratedDocument<DirectChat>;

@Schema({ _id: false })
export class DirectMessage {
  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class DirectChat {
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participants: Types.ObjectId[];

  @Prop({ type: [DirectMessage], default: [] })
  messages: DirectMessage[];
}

export const DirectChatSchema = SchemaFactory.createForClass(DirectChat);
DirectChatSchema.index({ participants: 1 });
