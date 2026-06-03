import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRequest, ChatRequestSchema } from '../schemas/chat-request.schema';
import { DirectChat, DirectChatSchema } from '../schemas/direct-chat.schema';
import { Friendship, FriendshipSchema } from '../schemas/friendship.schema';
import { UsersModule } from '../users/users.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: ChatRequest.name, schema: ChatRequestSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: DirectChat.name, schema: DirectChatSchema },
    ]),
  ],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
