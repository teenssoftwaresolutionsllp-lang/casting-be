import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController, PhotosController, VideoUploadController } from './media.controller.js';
import { VideoModule } from '../videos/video.module.js';
import { UserModule } from '../users/user.module.js';

@Module({
  imports: [VideoModule, UserModule],
  controllers: [MediaController, PhotosController, VideoUploadController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
