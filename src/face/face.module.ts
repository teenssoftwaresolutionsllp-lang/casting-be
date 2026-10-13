import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FaceController } from './face.controller';
import { FaceCryptoService } from './face-crypto.service';
import { FaceEmbeddingLengthValidator } from './dto/embedding-length.validator';
import { FaceRepository } from './face.repository';
import { FaceService } from './face.service';
import { FaceVerifiedGuard } from './face-verified.guard';

@Module({
  imports: [ConfigModule, ActivityLogModule],
  controllers: [FaceController],
  providers: [
    FaceService,
    FaceRepository,
    FaceCryptoService,
    FaceEmbeddingLengthValidator,
    JwtAuthGuard,
    FaceVerifiedGuard,
  ],
  exports: [FaceService, FaceVerifiedGuard, JwtAuthGuard],
})
export class FaceModule {}
