import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChartService } from './chart.service';
import {
  CreateRelationDto,
  LiuNianReportDto,
  UpsertBirthProfileDto,
  VoiceDiaryDto,
  WeeklyFocusDto,
} from './dto/chart.dto';

@Controller('chart')
@UseGuards(JwtAuthGuard)
export class ChartController {
  constructor(private chartService: ChartService) {}

  @Put('birth-profile')
  upsertBirth(@Req() req: { user: { userId: string } }, @Body() dto: UpsertBirthProfileDto) {
    return this.chartService.upsertBirthProfile(req.user.userId, dto);
  }

  @Get('birth-profile')
  getBirth(@Req() req: { user: { userId: string } }) {
    return this.chartService.getBirthProfile(req.user.userId);
  }

  @Get('report-hub')
  reportHub(@Req() req: { user: { userId: string } }, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.chartService.getReportHub(req.user.userId, y);
  }

  @Get('horoscope')
  horoscope(@Req() req: { user: { userId: string } }, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.chartService.getHoroscope(req.user.userId, y);
  }

  @Post('reports/natal')
  natalReport(@Req() req: { user: { userId: string } }) {
    return this.chartService.generateNatalReport(req.user.userId);
  }

  @Post('reports/daxian')
  daxianReport(@Req() req: { user: { userId: string } }) {
    return this.chartService.generateDaxianReport(req.user.userId);
  }

  @Post('reports/liunian')
  liunianReport(
    @Req() req: { user: { userId: string } },
    @Body() dto: LiuNianReportDto,
  ) {
    return this.chartService.generateLiunianReport(req.user.userId, dto.year);
  }

  @Get('relations')
  listRelations(@Req() req: { user: { userId: string } }) {
    return this.chartService.listRelations(req.user.userId);
  }

  @Get('relations/:id')
  getRelation(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.chartService.getRelation(req.user.userId, id);
  }

  @Post('relations')
  addRelation(@Req() req: { user: { userId: string } }, @Body() dto: CreateRelationDto) {
    return this.chartService.addRelation(req.user.userId, dto);
  }

  @Delete('relations/:id')
  deleteRelation(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.chartService.deleteRelation(req.user.userId, id);
  }

  @Post('relations/:id/report')
  relationReport(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.chartService.generateRelationReport(req.user.userId, id);
  }

  @Get('life-context')
  lifeContext(@Req() req: { user: { userId: string } }) {
    return this.chartService.getLifeContext(req.user.userId);
  }

  @Put('weekly-focus')
  weeklyFocus(@Req() req: { user: { userId: string } }, @Body() dto: WeeklyFocusDto) {
    return this.chartService.setWeeklyFocus(req.user.userId, dto.focus);
  }

  @Post('voice-diary')
  voiceDiary(@Req() req: { user: { userId: string } }, @Body() dto: VoiceDiaryDto & { audioBase64?: string }) {
    return this.chartService.transcribeAndSaveVoice(req.user.userId, dto.text, dto.audioBase64);
  }

  @Post('chat-summary')
  chatSummary(@Req() req: { user: { userId: string } }) {
    return this.chartService.refreshChatSummary(req.user.userId);
  }
}
