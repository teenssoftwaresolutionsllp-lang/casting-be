import { Module, forwardRef } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [VideoController],
  providers: [VideoService, VideoRepository],
  exports: [VideoService, VideoRepository],
})
export class VideoModule {}
