import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { AiModule } from './ai/ai.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { ChartModule } from './chart/chart.module';
import { MemoryModule } from './memory/memory.module';
import { ReportsModule } from './reports/reports.module';
import { AgentModule } from './agent/agent.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    CommonModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://localhost:27017/soulmirror',
      }),
      inject: [ConfigService],
    }),
    AiModule,
    AuthModule,
    UsersModule,
    ReportsModule,
    BotModule,
    ChartModule,
    AnalysisModule,
    TestsModule,
    AgentModule,
    MemoryModule,
  ],
})
export class AppModule {}
