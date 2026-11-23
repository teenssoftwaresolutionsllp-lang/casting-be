import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StoriesController } from './stories.controller';
import { StoriesRepository } from './stories.repository';
import { StoriesService } from './stories.service';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Module({
  imports: [MediaModule, forwardRef(() => NotificationModule)],
  controllers: [StoriesController],
  providers: [
    StoriesService,
    StoriesRepository,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class StoriesModule {}
