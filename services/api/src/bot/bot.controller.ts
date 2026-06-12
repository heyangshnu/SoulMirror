import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BotService } from './bot.service';
import { AppendMessagesDto } from './dto/append-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('bot')
@UseGuards(JwtAuthGuard)
export class BotController {
  constructor(private botService: BotService) {}

  @Get('sessions')
  sessions(@Req() req: { user: { userId: string } }) {
    return this.botService.listSessions(req.user.userId);
  }

  @Post('sessions')
  createSession(@Req() req: { user: { userId: string } }) {
    return this.botService.createSession(req.user.userId);
  }

  @Get('sessions/:id')
  getSession(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.botService.getSession(req.user.userId, id);
  }

  @Post('sessions/:id/messages/append')
  appendMessages(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: AppendMessagesDto,
  ) {
    return this.botService.appendMessages(req.user.userId, id, dto.messages);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.botService.sendMessage(req.user.userId, id, dto.message);
  }

  @Post('sessions/:id/messages/stream')
  streamMessage(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    return this.botService.streamMessage(req.user.userId, id, dto.message, res);
  }
}
