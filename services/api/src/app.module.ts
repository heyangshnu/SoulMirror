import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { ChartModule } from './chart/chart.module';
import { ReportsModule } from './reports/reports.module';
import { SocialModule } from './social/social.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
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
    TestsModule,
    ReportsModule,
    BotModule,
    ChartModule,
    SocialModule,
  ],
})
export class AppModule {}
