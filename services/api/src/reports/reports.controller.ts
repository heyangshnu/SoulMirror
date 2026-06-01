import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.reportsService.findByUser(req.user.userId);
  }

  @Get(':id')
  getOne(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.reportsService.findOne(req.user.userId, id);
  }

  @Post(':id/favorite')
  favorite(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.reportsService.toggleFavorite(req.user.userId, id);
  }
}
