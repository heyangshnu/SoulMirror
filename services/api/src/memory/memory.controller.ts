import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemoryService } from './memory.service';
import { ConfirmMemoryDto } from './dto/memory.dto';

@Controller('memory')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  @Get('dashboard')
  dashboard(@Req() req: { user: { userId: string } }) {
    return this.memoryService.getDashboard(req.user.userId);
  }

  @Get('current-topic')
  currentTopic(@Req() req: { user: { userId: string } }) {
    return this.memoryService.getCurrentTopic(req.user.userId);
  }

  @Get('recent-activity')
  recentActivity(@Req() req: { user: { userId: string } }, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 8;
    return this.memoryService.getRecentActivity(req.user.userId, Number.isFinite(n) ? n : 8);
  }

  @Get('domain/:domain')
  domain(@Req() req: { user: { userId: string } }, @Param('domain') domain: string) {
    return this.memoryService.getDomain(req.user.userId, domain);
  }

  @Get('topics')
  topics(
    @Req() req: { user: { userId: string } },
    @Query('status') status?: string,
  ) {
    return this.memoryService.getTopics(req.user.userId, status);
  }

  @Get('topics/:id')
  topic(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.memoryService.getTopic(req.user.userId, id);
  }

  @Get('pending')
  pending(@Req() req: { user: { userId: string } }) {
    return this.memoryService.getPending(req.user.userId);
  }

  @Post('confirm')
  confirm(@Req() req: { user: { userId: string } }, @Body() dto: ConfirmMemoryDto) {
    return this.memoryService.confirm(req.user.userId, dto.noteId, dto.action);
  }

  @Get('events/:id')
  event(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.memoryService.getEvent(req.user.userId, id);
  }
}

@Controller('ming')
@UseGuards(JwtAuthGuard)
export class MingController {
  constructor(private memoryService: MemoryService) {}

  @Get('reports')
  reports(@Req() req: { user: { userId: string } }) {
    return this.memoryService.getMingReports(req.user.userId);
  }

  @Get('reports/:code')
  report(
    @Req() req: { user: { userId: string } },
    @Param('code') code: string,
    @Query('rel') rel?: string,
  ) {
    return this.memoryService.getMingReport(req.user.userId, code, rel);
  }
}
