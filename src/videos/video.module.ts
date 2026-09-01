import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { UserModule } from '../users/user.module';

@Module({
  imports: [UserModule],
  controllers: [VideoController],
  providers: [VideoService, VideoRepository],
  exports: [VideoService, VideoRepository],
})
export class VideoModule {}
