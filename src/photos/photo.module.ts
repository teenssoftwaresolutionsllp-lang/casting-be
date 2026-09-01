import { Module } from '@nestjs/common';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { PhotoRepository } from './photo.repository';
import { UserModule } from '../users/user.module';

@Module({
  imports: [UserModule],
  controllers: [PhotoController],
  providers: [PhotoService, PhotoRepository],
  exports: [PhotoService, PhotoRepository],
})
export class PhotoModule {}
