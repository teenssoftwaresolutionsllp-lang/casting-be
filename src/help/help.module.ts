import { Module } from '@nestjs/common';
import { UserModule } from '../users/user.module';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [UserModule],
  controllers: [HelpController],
  providers: [HelpService, JwtAuthGuard],
})
export class HelpModule {}
