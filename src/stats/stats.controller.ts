import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get live aggregate statistics for the platform' })
  @ApiResponse({
    status: 200,
    description:
      'Live counts. Metrics not tracked by the database are returned as null.',
  })
  getLiveStats() {
    return this.statsService.getLiveStats();
  }
}
