import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ _id: false })
export class ReportSection {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;
}

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  testType: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  summary: string;

  @Prop()
  score?: number;

  @Prop()
  scoreLabel?: string;

  @Prop({ type: [ReportSection], default: [] })
  sections: ReportSection[];

  @Prop({ type: Object })
  raw?: Record<string, unknown>;

  @Prop({ default: false })
  favorited: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
