import { Module, Global } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogService } from './activity-log.service';

@Global()
@Module({
  providers: [ActivityLogRepository, ActivityLogService],
  exports: [ActivityLogRepository, ActivityLogService],
})
export class ActivityLogModule {}
