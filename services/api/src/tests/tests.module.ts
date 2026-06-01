import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { TestsSubmitController } from './tests-submit.controller';

@Module({
  imports: [ReportsModule, UsersModule],
  controllers: [TestsController, TestsSubmitController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
