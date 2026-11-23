import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController, PhotosController, VideoUploadController } from './media.controller.js';
import { VideoModule } from '../videos/video.module.js';
import { UserModule } from '../users/user.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';

@Module({
  imports: [VideoModule, UserModule],
  controllers: [MediaController, PhotosController, VideoUploadController],
  providers: [MediaService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [MediaService],
})
export class MediaModule {}
