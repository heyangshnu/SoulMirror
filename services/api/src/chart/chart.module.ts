import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentModule } from '../agent/agent.module';
import { BotSession, BotSessionSchema } from '../schemas/bot-session.schema';
import { BirthProfile, BirthProfileSchema } from '../schemas/birth-profile.schema';
import { LifeContext, LifeContextSchema } from '../schemas/life-context.schema';
import { RelationProfile, RelationProfileSchema } from '../schemas/relation-profile.schema';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BirthProfile.name, schema: BirthProfileSchema },
      { name: RelationProfile.name, schema: RelationProfileSchema },
      { name: LifeContext.name, schema: LifeContextSchema },
      { name: BotSession.name, schema: BotSessionSchema },
    ]),
    ReportsModule,
    UsersModule,
    AgentModule,
  ],
  controllers: [ChartController],
  providers: [ChartService],
  exports: [ChartService],
})
export class ChartModule {}
