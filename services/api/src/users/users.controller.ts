import { Body, Controller, Delete, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      id: user?._id,
      phone: user?.phone,
      nickname: user?.nickname,
      ageRange: user?.ageRange,
      occupation: user?.occupation,
      concern: user?.concern,
      botTone: user?.botTone ?? 'gentle',
      anonymousMode: user?.anonymousMode ?? false,
    };
  }

  @Put('profile')
  updateProfile(@Req() req: { user: { userId: string } }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Delete()
  deleteAccount(@Req() req: { user: { userId: string } }) {
    return this.usersService.deleteAccount(req.user.userId);
  }
}
