import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { UserModule } from '../users/user.module';
import { OtpAuthController } from './otp-auth.controller';
import { OtpAuthService } from './otp-auth.service';
import { Msg91Service } from './msg91.service';
import { OtpGuardService } from './otp-guard.service';

@Module({
  imports: [UserModule],
  controllers: [AuthController, OtpAuthController],
  providers: [
    AuthService,
    FirebaseService,
    OtpAuthService,
    Msg91Service,
    OtpGuardService,
  ],
  exports: [AuthService, FirebaseService],
})
export class AuthModule {}
