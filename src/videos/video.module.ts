import { Module, forwardRef } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [VideoController],
  providers: [
    VideoService,
    VideoRepository,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [VideoService, VideoRepository],
})
export class VideoModule {}
