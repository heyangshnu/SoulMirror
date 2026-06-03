import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartModule } from '../chart/chart.module';
import { BotSession, BotSessionSchema } from '../schemas/bot-session.schema';
import { UsersModule } from '../users/users.module';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';

@Module({
  imports: [
    UsersModule,
    ChartModule,
    MongooseModule.forFeature([{ name: BotSession.name, schema: BotSessionSchema }]),
  ],
  controllers: [BotController],
  providers: [BotService],
})
export class BotModule {}
