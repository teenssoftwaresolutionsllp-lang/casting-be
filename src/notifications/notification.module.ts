import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { FcmService } from './fcm.service';
import { UserRepository } from '../users/user.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    FcmService,
    UserRepository,
    JwtAuthGuard,
  ],
  exports: [NotificationService, NotificationRepository, FcmService],
})
export class NotificationModule {}
