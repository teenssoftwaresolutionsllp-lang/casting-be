import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user profile as either an Artist or Audience' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created. Returns JWT token.',
  })
  @ApiResponse({ status: 400, description: 'Bad request or email already taken.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Credentials validated successfully. Returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password credentials.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register automatically using Firebase Google ID Token' })
  @ApiResponse({
    status: 200,
    description: 'Google token verified successfully. Returns JWT token and user profile.',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired Google ID token.' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset link by email' })
  @ApiResponse({
    status: 200,
    description:
      'If the account exists, a reset email was sent. In local dev mode, the response includes resetToken for Swagger testing.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        resetToken: { type: 'string', description: 'Returned only when PASSWORD_RESET_DEV_MODE is enabled outside production.' },
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset.' })
  @ApiResponse({ status: 400, description: 'The reset token is invalid or expired.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
