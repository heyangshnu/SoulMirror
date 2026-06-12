import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalysisService } from './analysis.service';
import { ChatUploadDto, FollowUpDto, RealContextDto, RecentYearsDto, SynastryDto } from './dto/analysis.dto';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post('natal')
  natal(@Req() req: { user: { userId: string } }, @Body() body: { topic?: string }) {
    return this.analysisService.generateNatal(req.user.userId, body.topic ?? 'self_profile');
  }

  @Post('recent-years')
  recentYears(@Req() req: { user: { userId: string } }, @Body() dto: RecentYearsDto) {
    return this.analysisService.generateRecentYears(req.user.userId, dto.year);
  }

  @Post('synastry')
  synastry(@Req() req: { user: { userId: string } }, @Body() dto: SynastryDto) {
    return this.analysisService.generateSynastry(req.user.userId, dto.relationId);
  }

  @Post('child')
  child(@Req() req: { user: { userId: string } }, @Body() dto: SynastryDto) {
    return this.analysisService.generateChild(req.user.userId, dto.relationId);
  }

  @Post('family-system')
  familySystem(@Req() req: { user: { userId: string } }) {
    return this.analysisService.generateFamilySystem(req.user.userId);
  }

  @Post('reports/:id/export')
  async exportReport(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.analysisService.exportReportPdf(req.user.userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="soulmirror-plan.pdf"');
    res.send(pdf);
  }

  @Get('reports/:id')
  getReport(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.analysisService.getPlanReport(req.user.userId, id);
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class FollowUpController {
  constructor(private analysisService: AnalysisService) {}

  @Put('chart/real-context')
  realContext(@Req() req: { user: { userId: string } }, @Body() dto: RealContextDto) {
    return this.analysisService.upsertRealContext(req.user.userId, dto);
  }

  @Get('chart/real-context')
  getRealContext(@Req() req: { user: { userId: string } }) {
    return this.analysisService.getRealContext(req.user.userId);
  }

  @Post('followup/ask')
  ask(@Req() req: { user: { userId: string } }, @Body() dto: FollowUpDto) {
    return this.analysisService.followUp(req.user.userId, dto);
  }

  @Post('chart/chat-upload')
  chatUpload(@Req() req: { user: { userId: string } }, @Body() dto: ChatUploadDto) {
    return this.analysisService.analyzeChatUpload(req.user.userId, dto.text);
  }
}
