import { Module, forwardRef } from '@nestjs/common';
import { AuditionController } from './audition.controller';
import { AuditionService } from './audition.service';
import { AuditionRepository } from './audition.repository';
import { ApplicationModule } from '../applications/application.module';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Module({
  imports: [forwardRef(() => ApplicationModule), forwardRef(() => NotificationModule)],
  controllers: [AuditionController],
  providers: [
    AuditionService,
    AuditionRepository,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [AuditionService, AuditionRepository],
})
export class AuditionModule {}
