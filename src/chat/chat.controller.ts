import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Chats & Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start/:userId')
  @ApiOperation({ summary: 'Find or create a chat room with a specific user' })
  @ApiResponse({ status: 201, description: 'Returns the chatId.' })
  async startChat(@CurrentUser() user: any, @Param('userId') targetUserId: string) {
    return this.chatService.findOrCreateChat(user.sub, targetUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List all active chats for the current user' })
  @ApiResponse({ status: 200, description: 'Returns list of chats with last messages.' })
  async getUserChats(@CurrentUser() user: any) {
    return this.chatService.getUserChats(user.sub);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Retrieve the message history for a specific chat' })
  @ApiResponse({ status: 200, description: 'Returns list of messages.' })
  async getMessages(@CurrentUser() user: any, @Param('id') chatId: string) {
    return this.chatService.getMessages(chatId, user.sub);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(chatId, user.sub, dto.text);
  }
}
