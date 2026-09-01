import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DbModule } from './db/db.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { VideoModule } from './videos/video.module';
import { PhotoModule } from './photos/photo.module';
import { AuditionModule } from './auditions/audition.module';
import { ApplicationModule } from './applications/application.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notifications/notification.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    // Global environment config
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Global JWT registration
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'supersecretjwtkeyforcastingapp2026',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    
    // Application feature modules
    DbModule,
    AuthModule,
    UserModule,
    BillingModule,
    MediaModule,
    VideoModule,
    PhotoModule,
    AuditionModule,
    ApplicationModule,
    ChatModule,
    NotificationModule,
  ],
})
export class AppModule {}
