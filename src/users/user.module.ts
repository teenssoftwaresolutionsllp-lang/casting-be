import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [UserController],
  providers: [UserService, UserRepository, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [UserService, UserRepository],
})
export class UserModule {}
