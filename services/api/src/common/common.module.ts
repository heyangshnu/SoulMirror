import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LegacyChainGuard } from './legacy-chain.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LegacyChainGuard],
  exports: [LegacyChainGuard],
})
export class CommonModule {}
