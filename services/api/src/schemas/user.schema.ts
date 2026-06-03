import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class MatchProfile {
  @Prop()
  mbti?: string;

  @Prop()
  baziElement?: string;

  @Prop()
  tarotArchetype?: string;

  @Prop({ type: Object, default: {} })
  scores: Record<string, number>;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ sparse: true, unique: true })
  phone?: string;

  @Prop({ sparse: true, unique: true, lowercase: true, trim: true })
  email?: string;

  @Prop()
  passwordHash?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  termsAcceptedAt?: Date;

  @Prop()
  termsVersion?: string;

  @Prop({ default: '心镜用户' })
  nickname: string;

  @Prop()
  ageRange?: string;

  @Prop()
  occupation?: string;

  @Prop()
  concern?: string;

  @Prop({ default: 'gentle' })
  botTone: string;

  @Prop({ default: false })
  anonymousMode: boolean;

  @Prop()
  lastTestSummary?: string;

  @Prop()
  chartContext?: string;

  @Prop({ default: false })
  discoverable: boolean;

  @Prop({ type: MatchProfile })
  matchProfile?: MatchProfile;
}

export const UserSchema = SchemaFactory.createForClass(User);
