import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { NotificationModule } from '../notifications/notification.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, JwtAuthGuard],
  exports: [ChatService, ChatRepository],
})
export class ChatModule {}
