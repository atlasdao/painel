import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LevelsService } from './levels.service';

@Controller({ path: 'levels', version: '1' })
@UseGuards(JwtAuthGuard)
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get('configurations')
  async getLevelConfigurations() {
    return this.levelsService.getLevelConfigurations();
  }

  @Get('user')
  async getUserLevel(@Request() req: any) {
    return this.levelsService.getUserLevel(req.user.id);
  }

  @Get('history')
  async getLevelHistory(@Request() req: any) {
    return this.levelsService.getLevelHistory(req.user.id);
  }

  @Get('stats')
  async getLevelStats(@Request() req: any) {
    return this.levelsService.getLevelStats(req.user.id);
  }

  @Post('upgrade')
  async upgradeLevel(@Request() req: any) {
    return this.levelsService.upgradeLevel(req.user.id);
  }
}