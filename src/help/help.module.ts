import { Module } from '@nestjs/common';
import { UserModule } from '../users/user.module';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';

@Module({
  imports: [UserModule],
  controllers: [HelpController],
  providers: [HelpService],
})
export class HelpModule {}
