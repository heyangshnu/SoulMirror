import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { ChartModule } from '../chart/chart.module';
import { LifeContext, LifeContextSchema } from '../schemas/life-context.schema';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { AnalysisController, FollowUpController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([{ name: LifeContext.name, schema: LifeContextSchema }]),
    AiModule,
    ChartModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [AnalysisController, FollowUpController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
