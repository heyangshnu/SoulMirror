import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryController, MingController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryIndexCache, MemoryIndexCacheSchema } from './schemas/memory-index-cache.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: MemoryIndexCache.name, schema: MemoryIndexCacheSchema }]),
  ],
  controllers: [MemoryController, MingController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
