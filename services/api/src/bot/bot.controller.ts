import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BotService } from './bot.service';
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

  @Post('sessions/:id/messages')
  sendMessage(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.botService.sendMessage(req.user.userId, id, dto.message);
  }
}
