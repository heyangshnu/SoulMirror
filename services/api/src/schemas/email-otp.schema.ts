import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailOtpDocument = HydratedDocument<EmailOtp>;

@Schema({ timestamps: true })
export class EmailOtp {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true, enum: ['register', 'reset'] })
  purpose: 'register' | 'reset';

  @Prop({ required: true })
  codeHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmailOtpSchema = SchemaFactory.createForClass(EmailOtp);
EmailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
