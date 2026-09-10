import { Module, forwardRef } from '@nestjs/common';
import { AuditionController } from './audition.controller';
import { AuditionService } from './audition.service';
import { AuditionRepository } from './audition.repository';
import { ApplicationModule } from '../applications/application.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [forwardRef(() => ApplicationModule), UserModule],
  controllers: [AuditionController],
  providers: [AuditionService, AuditionRepository],
  exports: [AuditionService, AuditionRepository],
})
export class AuditionModule {}
