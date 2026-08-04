import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Returns a list of alerts.' })
  async getNotifications(@CurrentUser() user: any) {
    return this.notificationService.getMyNotifications(user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all active notifications as read' })
  @ApiResponse({ status: 200, description: 'Marked all as read successfully.' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications cleared.' })
  async clearAll(@CurrentUser() user: any) {
    return this.notificationService.clearAll(user.sub);
  }
}
