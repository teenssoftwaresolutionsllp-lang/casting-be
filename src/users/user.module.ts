import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { QuotaService } from './quota.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository, QuotaService],
  exports: [UserService, UserRepository, QuotaService],
})
export class UserModule {}
