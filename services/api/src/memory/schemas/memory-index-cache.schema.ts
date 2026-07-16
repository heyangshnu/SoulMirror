import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MemoryIndexCacheDocument = HydratedDocument<MemoryIndexCache>;

@Schema({ timestamps: true })
export class MemoryIndexCache {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  cacheKey: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ required: true })
  expiresAt: Date;
}

export const MemoryIndexCacheSchema = SchemaFactory.createForClass(MemoryIndexCache);

MemoryIndexCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
MemoryIndexCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
