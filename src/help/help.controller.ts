import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendHelpMessageDto } from './dto/send-help-message.dto';
import { HelpService } from './help.service';

@ApiTags('Help')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('help')
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  @Post()
  @ApiOperation({ summary: 'Send a help message to the support team' })
  @ApiResponse({ status: 201, description: 'Help message sent successfully.' })
  async sendMessage(
    @CurrentUser() user: { sub: string },
    @Body() dto: SendHelpMessageDto,
  ) {
    return this.helpService.sendMessage(user.sub, dto.message);
  }
}
