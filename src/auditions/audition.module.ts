import { Module, forwardRef } from '@nestjs/common';
import { AuditionController } from './audition.controller';
import { AuditionService } from './audition.service';
import { AuditionRepository } from './audition.repository';
import { ApplicationModule } from '../applications/application.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [forwardRef(() => ApplicationModule), forwardRef(() => NotificationModule)],
  controllers: [AuditionController],
  providers: [AuditionService, AuditionRepository],
  exports: [AuditionService, AuditionRepository],
})
export class AuditionModule {}
