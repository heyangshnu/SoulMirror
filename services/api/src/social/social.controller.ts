import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('discover/status')
  discoverStatus(@Req() req: { user: { userId: string } }) {
    return this.socialService.getDiscoverStatus(req.user.userId);
  }

  @Post('discover/enable')
  setDiscoverable(
    @Req() req: { user: { userId: string } },
    @Body() body: { discoverable: boolean },
  ) {
    return this.socialService.setDiscoverable(req.user.userId, body.discoverable ?? false);
  }

  @Get('discover')
  discover(@Req() req: { user: { userId: string } }) {
    return this.socialService.discover(req.user.userId);
  }

  @Post('chat-requests')
  sendRequest(
    @Req() req: { user: { userId: string } },
    @Body() body: { toUserId: string; message?: string },
  ) {
    return this.socialService.sendChatRequest(req.user.userId, body.toUserId, body.message);
  }

  @Get('chat-requests')
  listRequests(@Req() req: { user: { userId: string } }) {
    return this.socialService.listChatRequests(req.user.userId);
  }

  @Patch('chat-requests/:id')
  respondRequest(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { accept: boolean },
  ) {
    return this.socialService.respondChatRequest(req.user.userId, id, body.accept);
  }

  @Get('friends')
  friends(@Req() req: { user: { userId: string } }) {
    return this.socialService.listFriends(req.user.userId);
  }

  @Get('chats/:friendId')
  getChat(@Req() req: { user: { userId: string } }, @Param('friendId') friendId: string) {
    return this.socialService.getDirectChat(req.user.userId, friendId);
  }

  @Post('chats/:friendId/messages')
  sendMessage(
    @Req() req: { user: { userId: string } },
    @Param('friendId') friendId: string,
    @Body() body: { content: string },
  ) {
    return this.socialService.sendDirectMessage(req.user.userId, friendId, body.content);
  }
}
