import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentWsProxy } from './agent-ws.proxy';
import { AgentInitStatus, AgentInitStatusSchema } from './schemas/agent-init-status.schema';
import { AgentRun, AgentRunSchema } from './schemas/agent-run.schema';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UsersModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: AgentInitStatus.name, schema: AgentInitStatusSchema },
      { name: AgentRun.name, schema: AgentRunSchema },
    ]),
    ReportsModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentWsProxy],
  exports: [AgentService, AgentWsProxy],
})
export class AgentModule {}
