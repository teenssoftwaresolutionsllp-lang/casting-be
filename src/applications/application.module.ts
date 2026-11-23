import { Module, forwardRef } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { AuditionModule } from '../auditions/audition.module';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [forwardRef(() => AuditionModule), NotificationModule],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationRepository, JwtAuthGuard],
  exports: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}
