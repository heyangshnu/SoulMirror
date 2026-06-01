import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from '../ai/ai.service';
import { TestsService } from './tests.service';

@Controller('tests')
@UseGuards(JwtAuthGuard)
export class TestsSubmitController {
  constructor(
    private testsService: TestsService,
    private ai: AiService,
  ) {}

  @Get('mbti/questions')
  mbtiQuestions() {
    return this.ai.get('/mbti/questions');
  }

  @Post('mbti/submit')
  mbtiSubmit(@Req() req: { user: { userId: string } }, @Body() body: unknown) {
    return this.testsService.submitAndSave(req.user.userId, '/mbti/submit', body);
  }

  @Post('bazi/submit')
  baziSubmit(@Req() req: { user: { userId: string } }, @Body() body: unknown) {
    return this.testsService.submitAndSave(req.user.userId, '/bazi/submit', body);
  }

  @Post('tarot/draw')
  tarotDraw(@Req() req: { user: { userId: string } }, @Body() body: unknown) {
    return this.testsService.submitAndSave(req.user.userId, '/tarot/draw', body);
  }

  @Post('palm/upload')
  palmUpload(@Req() req: { user: { userId: string } }, @Body() body: unknown) {
    return this.testsService.submitAndSave(req.user.userId, '/palm/analyze', body);
  }
}
