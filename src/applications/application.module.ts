import { Module, forwardRef } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { AuditionModule } from '../auditions/audition.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [forwardRef(() => AuditionModule), forwardRef(() => NotificationModule)],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationRepository],
  exports: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}
