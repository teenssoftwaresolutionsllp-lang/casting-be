import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OtpAuthService } from './otp-auth.service';
import {
  OtpPhoneDto,
  OtpSignupDto,
  VerifyPhoneOtpDto,
} from './dto/otp-phone.dto';

@ApiTags('Phone OTP Authentication')
@Controller('auth/otp')
export class OtpAuthController {
  constructor(private readonly otpAuthService: OtpAuthService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a phone sign-in OTP' })
  send(
    @Body() body: OtpPhoneDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.otpAuthService.send(
      body?.phone,
      request.ip || 'unknown',
      response,
    );
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a phone sign-in OTP' })
  resend(
    @Body() body: OtpPhoneDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.otpAuthService.resend(
      body?.phone,
      request.ip || 'unknown',
      response,
    );
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone OTP and login or request signup' })
  verify(
    @Body() body: VerifyPhoneOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.otpAuthService.verify(body?.phone, body?.otp, response);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Create a user after phone OTP verification' })
  signup(@Body() body: OtpSignupDto) {
    return this.otpAuthService.signup(body);
  }

  @Post('link/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to link a phone to the signed-in user' })
  sendLink(
    @CurrentUser() user: { sub: string },
    @Body() body: OtpPhoneDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.otpAuthService.sendLink(
      user.sub,
      body?.phone,
      request.ip || 'unknown',
      response,
    );
  }

  @Post('link/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and link a phone to the signed-in user' })
  verifyLink(
    @CurrentUser() user: { sub: string },
    @Body() body: VerifyPhoneOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.otpAuthService.verifyLink(
      user.sub,
      body?.phone,
      body?.otp,
      response,
    );
  }
}
