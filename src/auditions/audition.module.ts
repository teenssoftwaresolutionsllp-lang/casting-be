import { Module, forwardRef } from '@nestjs/common';
import { AuditionController } from './audition.controller';
import { AuditionService } from './audition.service';
import { AuditionRepository } from './audition.repository';
import { ApplicationModule } from '../applications/application.module';

@Module({
  imports: [forwardRef(() => ApplicationModule)],
  controllers: [AuditionController],
  providers: [AuditionService, AuditionRepository],
  exports: [AuditionService, AuditionRepository],
})
export class AuditionModule {}
