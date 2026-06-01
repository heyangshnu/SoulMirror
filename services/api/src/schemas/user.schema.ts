import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ sparse: true, unique: true })
  phone?: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
