import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengeDto } from './dto/challenge.dto';
import { ConsentDto } from './dto/consent.dto';
import { EnrollDto } from './dto/enroll.dto';
import { VerifyDto } from './dto/verify.dto';
import { FaceService } from './face.service';

interface AuthenticatedFaceUser {
  sub: string;
  iat?: number;
}

@ApiTags('Face Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('face')
export class FaceController {
  constructor(private readonly faceService: FaceService) {}

  @Post('consent')
  @ApiOperation({ summary: 'Record biometric consent' })
  async consent(
    @CurrentUser() user: AuthenticatedFaceUser,
    @Body() dto: ConsentDto,
  ) {
    return this.faceService.acceptConsent(user.sub, dto.version);
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll an encrypted face template' })
  async enroll(
    @CurrentUser() user: AuthenticatedFaceUser,
    @Body() dto: EnrollDto,
  ) {
    return this.faceService.enroll(user.sub, user.iat, dto);
  }

  @Post('challenge')
  @ApiOperation({ summary: 'Create a single-use face verification challenge' })
  async challenge(
    @CurrentUser() user: AuthenticatedFaceUser,
    @Body() dto: ChallengeDto,
  ) {
    return this.faceService.createChallenge(user.sub, dto.purpose);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify a face embedding against the enrolled template',
  })
  async verify(
    @CurrentUser() user: AuthenticatedFaceUser,
    @Body() dto: VerifyDto,
    @Req() request: Request,
  ) {
    return this.faceService.verify(user.sub, dto, {
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Get the current user biometric enrollment status' })
  async status(@CurrentUser() user: AuthenticatedFaceUser) {
    return this.faceService.getStatus(user.sub);
  }

  @Delete('enroll')
  @ApiOperation({ summary: 'Hard-delete the current user face template' })
  async deleteEnrollment(
    @CurrentUser() user: AuthenticatedFaceUser,
    @Req() request: Request,
  ) {
    return this.faceService.deleteEnrollment(user.sub, {
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
