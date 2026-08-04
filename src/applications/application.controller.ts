import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post('auditions/:id/apply')
  @ApiOperation({ summary: 'Apply for a specific casting call' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully.' })
  async apply(
    @CurrentUser() user: any,
    @Param('id') auditionId: string,
    @Body() dto: ApplyDto,
  ) {
    return this.applicationService.apply(auditionId, user.sub, dto);
  }

  @Get('applications/me')
  @ApiOperation({ summary: 'List all auditions the current user has applied to' })
  @ApiResponse({ status: 200, description: 'Returns list of applied auditions.' })
  async findMyApplications(@CurrentUser() user: any) {
    return this.applicationService.findMyApplications(user.sub);
  }

  @Delete('applications/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw an application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn.' })
  async withdraw(@CurrentUser() user: any, @Param('id') id: string) {
    return this.applicationService.withdraw(id, user.sub);
  }

  @Patch('applications/:id/status')
  @ApiOperation({ summary: 'Update status of an application (only for the audition creator)' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(id, user.sub, dto);
  }
}
