import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController, PhotosController, VideoUploadController } from './media.controller';
import { VideoModule } from '../videos/video.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [ConfigModule, VideoModule, UserModule],
  controllers: [MediaController, PhotosController, VideoUploadController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
