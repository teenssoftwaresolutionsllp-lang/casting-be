import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Param,
  ParseUUIDPipe,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class RegisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns notifications, pagination details, and unread count.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.notificationService.getMyNotifications(user.sub, limit, offset);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Returns unread notification count.' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.sub);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationService.markAsRead(user.sub, notificationId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all active notifications as read' })
  @ApiResponse({ status: 200, description: 'Marked all as read successfully.' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete one notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async deleteOne(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationService.deleteOne(user.sub, notificationId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications cleared.' })
  async clearAll(@CurrentUser() user: any) {
    return this.notificationService.clearAll(user.sub);
  }

  // ── FCM Token Registration ──────────────────────────────────────────────────

  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register or update the FCM device token for the current user',
    description:
      'Call this endpoint after the Flutter app receives a new FCM token (on app start or when onTokenRefresh fires). ' +
      'The token is stored per-user and used by the backend to deliver push notifications.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'fcm_device_token_here' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'FCM token registered successfully.' })
  @ApiResponse({ status: 400, description: 'Token must not be empty.' })
  async registerFcmToken(@CurrentUser() user: any, @Body() body: RegisterFcmTokenDto) {
    return this.notificationService.registerFcmToken(user.sub, body.token);
  }

  @Delete('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the FCM device token for the current user (on logout)' })
  @ApiResponse({ status: 200, description: 'FCM token cleared.' })
  async clearFcmToken(@CurrentUser() user: any) {
    return this.notificationService.clearFcmToken(user.sub);
  }
}
