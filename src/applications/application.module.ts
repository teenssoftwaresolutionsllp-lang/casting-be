import { Module, forwardRef } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { AuditionModule } from '../auditions/audition.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [forwardRef(() => AuditionModule), UserModule],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationRepository],
  exports: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}
