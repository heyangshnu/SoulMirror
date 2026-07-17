import { Body, Controller, Get, Post, Query, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Get('health')
  async health(): Promise<{
    ok: boolean;
    agentMode: 'legacy' | 'claude';
    host: { ok: boolean; service?: string; runtimeRoot?: string; memoryRoot?: string };
  }> {
    try {
      const host = await this.agentService.fetchHealth();
      return {
        ok: true,
        agentMode: this.agentService.agentMode,
        host,
      };
    } catch (err) {
      throw new ServiceUnavailableException(
        err instanceof Error ? err.message : 'agent-host unavailable',
      );
    }
  }

  @Get('transcript')
  @UseGuards(JwtAuthGuard)
  transcript(@Req() req: { user: { userId: string } }, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.agentService.fetchTranscript(req.user.userId, n);
  }

  @Get('init-status')
  @UseGuards(JwtAuthGuard)
  initStatus(@Req() req: { user: { userId: string } }) {
    return this.agentService.getInitStatus(req.user.userId);
  }

  @Post('init')
  @UseGuards(JwtAuthGuard)
  retryInit(@Req() req: { user: { userId: string } }) {
    return this.agentService.retryInit(req.user.userId);
  }

  @Post('fuxi-run')
  @UseGuards(JwtAuthGuard)
  runLazyFuxi(
    @Req() req: { user: { userId: string } },
    @Body() body?: { codes?: string[] },
  ) {
    return this.agentService.runLazyFuxiNodes(req.user.userId, body?.codes);
  }
}
