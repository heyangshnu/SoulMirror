import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InternalCardSchema, PlanCardSchema } from './plan-report.schema';

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

  @Prop()
  topic?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  summary: string;

  @Prop()
  headlineSummary?: string;

  @Prop()
  score?: number;

  @Prop()
  scoreLabel?: string;

  @Prop()
  themeLabel?: string;

  @Prop()
  portrait?: string;

  @Prop()
  stage?: string;

  @Prop()
  disclaimer?: string;

  @Prop({ enum: ['full', 'partial', 'minimal'] })
  coverageLevel?: string;

  @Prop({ type: [PlanCardSchema], default: [] })
  plans: PlanCardSchema[];

  @Prop({ type: [String], default: [] })
  followUpQuestions: string[];

  @Prop({ type: [InternalCardSchema], select: false })
  internal?: InternalCardSchema[];

  @Prop({ type: [ReportSection], default: [] })
  sections: ReportSection[];

  @Prop({ type: Object })
  raw?: Record<string, unknown>;

  @Prop({ default: false })
  favorited: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
