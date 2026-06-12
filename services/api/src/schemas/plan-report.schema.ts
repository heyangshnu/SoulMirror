import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class PlanCardSchema {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: [String], default: [] })
  actions: string[];

  @Prop({ type: [String] })
  phrases?: string[];
}

@Schema({ _id: false })
export class InternalCardSchema {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  conclusion: string;

  @Prop({ type: [Object], default: [] })
  sources: { type: string; evidence: string }[];

  @Prop({ type: [String], default: [] })
  reasoning: string[];

  @Prop({ default: 0.5 })
  confidence: number;

  @Prop({ type: [String], default: [] })
  matchedContentIds: string[];
}
