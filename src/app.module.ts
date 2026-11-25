import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DbModule } from './db/db.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { VideoModule } from './videos/video.module';  
import { AuditionModule } from './auditions/audition.module';
import { ApplicationModule } from './applications/application.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notifications/notification.module';
import { createTreeKoJwtOptions } from './auth/jwt.config';

@Module({
  imports: [
    // Global environment config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    // Global JWT registration
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createTreeKoJwtOptions(configService.get<string>('JWT_SECRET')),
      }),
    }),
    
    // Application feature modules
    DbModule,
    MediaModule,
    UserModule,
    AuthModule,
    VideoModule,
    AuditionModule,
    ApplicationModule,
    ChatModule,
    NotificationModule,
  ],
})
export class AppModule {}
