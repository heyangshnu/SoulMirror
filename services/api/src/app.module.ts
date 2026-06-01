import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { ReportsModule } from './reports/reports.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
