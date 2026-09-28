import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StoriesController } from './stories.controller';
import { StoriesRepository } from './stories.repository';
import { StoriesService } from './stories.service';

@Module({
  imports: [MediaModule],
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository],
})
export class StoriesModule {}
