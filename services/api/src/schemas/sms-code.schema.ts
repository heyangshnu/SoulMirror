import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SmsCodeDocument = HydratedDocument<SmsCode>;

@Schema({ timestamps: true })
export class SmsCode {
  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SmsCodeSchema = SchemaFactory.createForClass(SmsCode);
